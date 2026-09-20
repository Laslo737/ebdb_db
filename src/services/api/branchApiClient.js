const { fetchJson } = require('../../utils/http');

class BranchApiClient {
  constructor(config) {
    this.config = config;
  }

  headers() {
    if (!this.config.token) {
      throw new Error('BRANCH_API_TOKEN is not configured');
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.token}`
    };
  }

  async getAllBranches() {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/filials`, {
      method: 'GET',
      headers: this.headers()
    });
  }

  async searchPartnersByFio(fio) {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/search/by-fio/${encodeURIComponent(fio)}`, {
      method: 'GET',
      headers: this.headers()
    });
  }

  async createPartner(payload) {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload)
    });
  }

  async getPartnerById(partnerId) {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/${partnerId}`, {
      method: 'GET',
      headers: this.headers()
    });
  }

  async getPartnerContacts(partnerId) {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/${partnerId}/contacts`, {
      method: 'GET',
      headers: this.headers()
    });
  }

  async createPartnerContact(partnerId, payload) {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/${partnerId}/contacts`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload)
    });
  }

  async getTerritories() {
    return fetchJson(`${this.config.baseUrl}/api/v1/territories/`, {
      method: 'GET',
      headers: this.headers()
    });
  }

  async createTerritory(payload) {
    return fetchJson(`${this.config.baseUrl}/api/v1/territories/`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload)
    });
  }

  async getBranchById(filialId) {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/filials/${filialId}`, {
      method: 'GET',
      headers: this.headers()
    });
  }

  async searchByAddressTt(addressTt) {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/filials/search/by-address-tt/${encodeURIComponent(addressTt)}`, {
      method: 'GET',
      headers: this.headers()
    });
  }

  async getBranchContacts(filialId) {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/filials/${filialId}/contacts`, {
      method: 'GET',
      headers: this.headers()
    });
  }

  async createBranch(payload) {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/filials`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload)
    });
  }

  async updateBranch(filialId, payload) {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/filials/${filialId}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(payload)
    });
  }

  async getBranchIiko(filialId) {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/filials/${filialId}/iiko`, {
      method: 'GET',
      headers: this.headers()
    });
  }

  async createBranchIiko(filialId, payload) {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/filials/${filialId}/iiko`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload)
    });
  }

  async createBranchContact(filialId, payload) {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/filials/${filialId}/contacts`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload)
    });
  }

  async getBranchContact(contactId) {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/filials/contacts/${contactId}`, {
      method: 'GET',
      headers: this.headers()
    });
  }

  async updateBranchContact(contactId, payload) {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/filials/contacts/${contactId}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(payload)
    });
  }

  async deleteBranchContact(contactId) {
    return fetchJson(`${this.config.baseUrl}/api/v1/partners/filials/contacts/${contactId}`, {
      method: 'DELETE',
      headers: this.headers()
    });
  }
}

module.exports = { BranchApiClient };
