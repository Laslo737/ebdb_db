const test = require('node:test');
const assert = require('node:assert/strict');

const { searchBranches } = require('../src/utils/branchSearch');
const { BranchService } = require('../src/services/bot/branchService');

const vityazevoBranch = {
  id: 1235,
  jur_lico: 'ИП Шабалина Елена Петровна',
  iiko: { address_tt: 'Витязево_1Овр' }
};

test('searchBranches finds address_tt by its city prefix', () => {
  const result = searchBranches([vityazevoBranch], 'Витязево');

  assert.deepEqual(result, [vityazevoBranch]);
});

test('BranchService searches a wrapped branch-list API response', async () => {
  const apiClient = {
    async searchByAddressTt() {
      throw new Error('Exact address_tt was not found');
    },
    async getAllBranches() {
      return { items: [vityazevoBranch], total: 1 };
    }
  };
  const service = new BranchService(apiClient);

  const result = await service.findBranches('Витязево');

  assert.deepEqual(result, [vityazevoBranch]);
});

test('BranchService accepts a wrapped direct-search response', async () => {
  const apiClient = {
    async searchByAddressTt() {
      return { data: [vityazevoBranch] };
    },
    async getAllBranches() {
      throw new Error('Fallback must not be requested');
    }
  };
  const service = new BranchService(apiClient);

  const result = await service.findBranches('Витязево_1Овр');

  assert.deepEqual(result, [vityazevoBranch]);
});
