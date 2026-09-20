const { searchBranches } = require('../../utils/branchSearch');
const { normalizeText } = require('../../utils/text');

const LEGAL_FORM_STOPWORDS = new Set([
  'ип',
  'индивидуальный',
  'предприниматель',
  'ооо',
  'ооо.',
  'зао',
  'пао',
  'ао',
  'оао',
  'общество',
  'ограниченной',
  'ответственностью'
]);

function tokenizeJurLico(value) {
  return normalizeText(value)
    .replace(/["'`«»()\[\],.]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !LEGAL_FORM_STOPWORDS.has(token));
}

function normalizeJurLicoKey(value) {
  return tokenizeJurLico(value).join(' ');
}

function buildSimilarJurLicoKey(value) {
  const tokens = tokenizeJurLico(value);
  if (tokens.length < 2) return '';
  return tokens.slice(0, 2).join(' ');
}

function tokenizePartnerName(value) {
  return normalizeText(value)
    .replace(/["'`«»()\[\],.]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !LEGAL_FORM_STOPWORDS.has(token));
}

function normalizePartnerSearchValue(value) {
  return tokenizePartnerName(value).join(' ');
}

function buildPartnerSearchVariants(value) {
  const raw = String(value || '').trim();
  const normalized = normalizePartnerSearchValue(value);
  const tokens = tokenizePartnerName(value);
  const variants = [raw, normalized];

  if (tokens.length >= 2) {
    variants.push(tokens.slice(0, 2).join(' '));
  }

  if (tokens.length >= 3) {
    variants.push(tokens.slice(0, 3).join(' '));
  }

  return Array.from(new Set(variants.map((item) => String(item || '').trim()).filter(Boolean)));
}

function getPartnerSearchText(partner) {
  return [
    partner?.fio,
    partner?.fio_2,
    partner?.jur_info?.full_name_organization
  ].filter(Boolean).join(' ');
}

function getPartnerDisplayName(partner) {
  return String(partner?.jur_info?.full_name_organization || partner?.fio || '').trim();
}

function getTerritorySearchText(territory) {
  return String(territory?.name || '').trim();
}

class BranchService {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async findPartnersByFio(fio) {
    try {
      const result = await this.apiClient.searchPartnersByFio(fio);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      const detail = error?.data?.detail;
      if (typeof detail === 'string' && /не найдены/i.test(detail)) {
        return [];
      }

      throw error;
    }
  }

  async createPartner(payload) {
    return this.apiClient.createPartner(payload);
  }

  async getPartner(partnerId) {
    return this.apiClient.getPartnerById(partnerId);
  }

  async getPartnerContacts(partnerId) {
    return this.apiClient.getPartnerContacts(partnerId);
  }

  async createPartnerContact(partnerId, payload) {
    return this.apiClient.createPartnerContact(partnerId, payload);
  }

  async getTerritories() {
    const result = await this.apiClient.getTerritories();
    return Array.isArray(result) ? result : [];
  }

  async createTerritory(payload) {
    return this.apiClient.createTerritory(payload);
  }

  async searchTerritories(query) {
    const territories = await this.getTerritories();
    const queryText = normalizeText(query);
    const tokens = queryText.split(/\s+/).filter(Boolean);

    return territories
      .filter((territory) => {
        const haystack = normalizeText(getTerritorySearchText(territory));
        if (!haystack) return false;
        if (!tokens.length) return true;
        return tokens.every((token) => haystack.includes(token));
      })
      .sort((a, b) => {
        const aText = normalizeText(getTerritorySearchText(a));
        const bText = normalizeText(getTerritorySearchText(b));
        const aExact = aText === queryText ? 1 : 0;
        const bExact = bText === queryText ? 1 : 0;
        return bExact - aExact || String(a.name || '').localeCompare(String(b.name || ''), 'ru');
      });
  }

  async searchPartners(query) {
    const variants = buildPartnerSearchVariants(query);
    const byId = new Map();

    for (const variant of variants) {
      const partners = await this.findPartnersByFio(variant);
      for (const partner of partners) {
        if (partner?.id != null) {
          byId.set(String(partner.id), partner);
        }
      }
    }

    const all = Array.from(byId.values());
    const queryTokens = tokenizePartnerName(query);

    return all
      .filter((partner) => {
        if (!queryTokens.length) return true;
        const haystack = normalizeText(getPartnerSearchText(partner));
        if (!haystack) return false;
        if (queryTokens.length >= 2) {
          return queryTokens.every((token) => haystack.includes(token));
        }
        return queryTokens.some((token) => haystack.includes(token));
      })
      .sort((a, b) => {
        const aText = normalizeText(getPartnerSearchText(a));
        const bText = normalizeText(getPartnerSearchText(b));
        const queryText = normalizePartnerSearchValue(query);
        const aExact = aText === queryText ? 1 : 0;
        const bExact = bText === queryText ? 1 : 0;
        return bExact - aExact || Number(a.id) - Number(b.id);
      });
  }

  async findBranches(query) {
    const directResult = await this.tryDirectSearch(query);
    if (directResult.length) return directResult;

    const all = await this.apiClient.getAllBranches();
    return searchBranches(Array.isArray(all) ? all : [], query);
  }

  async tryDirectSearch(query) {
    try {
      const result = await this.apiClient.searchByAddressTt(query);
      if (Array.isArray(result)) return result;
      return result ? [result] : [];
    } catch {
      return [];
    }
  }

  async getBranch(branchId) {
    return this.apiClient.getBranchById(branchId);
  }

  async getBranchesWithoutAddressTt() {
    const all = await this.apiClient.getAllBranches();
    return (Array.isArray(all) ? all : [])
      .filter((branch) => !String(branch.iiko?.address_tt || '').trim())
      .sort((a, b) => Number(a.id) - Number(b.id));
  }

  async getDuplicateJurLicoGroups() {
    const allResult = await this.apiClient.getAllBranches();
    const all = Array.isArray(allResult) ? allResult : [];
    const groups = new Map();

    for (const branch of all) {
      const displayName = String(branch.jur_lico || '').trim();
      const key = normalizeJurLicoKey(displayName);
      if (!key) continue;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          displayName,
          branches: []
        });
      }

      groups.get(key).branches.push(branch);
    }

    return Array.from(groups.values())
      .filter((group) => group.branches.length > 1)
      .map((group) => ({
        ...group,
        branches: group.branches.sort((a, b) => Number(a.id) - Number(b.id))
      }))
      .sort((a, b) => b.branches.length - a.branches.length || a.displayName.localeCompare(b.displayName, 'ru'));
  }

  async getSimilarJurLicoGroups() {
    const allResult = await this.apiClient.getAllBranches();
    const all = Array.isArray(allResult) ? allResult : [];
    const groups = new Map();

    for (const branch of all) {
      const displayName = String(branch.jur_lico || '').trim();
      const key = buildSimilarJurLicoKey(displayName);
      const normalizedKey = normalizeJurLicoKey(displayName);
      if (!key || !normalizedKey) continue;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          displayName: displayName || key,
          branches: [],
          normalizedVariants: new Set()
        });
      }

      const group = groups.get(key);
      group.branches.push(branch);
      group.normalizedVariants.add(normalizedKey);
    }

    return Array.from(groups.values())
      .filter((group) => group.branches.length > 1 && group.normalizedVariants.size > 1)
      .map((group) => ({
        key: group.key,
        displayName: group.displayName,
        branches: group.branches.sort((a, b) => Number(a.id) - Number(b.id)),
        variants: Array.from(group.normalizedVariants).sort((a, b) => a.localeCompare(b, 'ru'))
      }))
      .sort((a, b) => b.branches.length - a.branches.length || a.displayName.localeCompare(b.displayName, 'ru'));
  }

  async getContacts(branchId) {
    return this.apiClient.getBranchContacts(branchId);
  }

  async createBranch(payload) {
    return this.apiClient.createBranch(payload);
  }

  async updateBranch(branchId, payload) {
    return this.apiClient.updateBranch(branchId, payload);
  }

  async getBranchDuplicatesForCreate({ addressTt, jurLico }) {
    const byAddress = addressTt ? await this.tryDirectSearch(addressTt) : [];
    if (byAddress.length) {
      return {
        byAddress,
        byJurLico: []
      };
    }

    const allResult = await this.apiClient.getAllBranches();
    const all = Array.isArray(allResult) ? allResult : [];
    const jurKey = normalizeJurLicoKey(jurLico);
    const byJurLico = jurKey
      ? all.filter((branch) => normalizeJurLicoKey(branch?.jur_lico) === jurKey)
      : [];

    return {
      byAddress: [],
      byJurLico: byJurLico.sort((a, b) => Number(a.id) - Number(b.id))
    };
  }

  async getBranchIiko(branchId) {
    return this.apiClient.getBranchIiko(branchId);
  }

  async createBranchIiko(branchId, payload) {
    return this.apiClient.createBranchIiko(branchId, payload);
  }

  async createContact(branchId, payload) {
    return this.apiClient.createBranchContact(branchId, payload);
  }

  async getContact(contactId) {
    return this.apiClient.getBranchContact(contactId);
  }

  async updateContact(contactId, payload) {
    return this.apiClient.updateBranchContact(contactId, payload);
  }

  async deleteContact(contactId) {
    return this.apiClient.deleteBranchContact(contactId);
  }
}

module.exports = { BranchService, getPartnerDisplayName };
