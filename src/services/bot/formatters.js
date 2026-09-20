function formatBranchCard(branch) {
  return [
    `Филиал #${branch.id}`,
    branch.iiko?.address_tt ? `TT: ${branch.iiko.address_tt}` : null,
    branch.jur_lico ? `Юр. лицо: ${branch.jur_lico}` : null,
    branch.status ? `Статус: ${branch.status}` : null,
    branch.location?.city ? `Город: ${branch.location.city}` : null,
    branch.location?.address ? `Адрес: ${branch.location.address}` : null
  ].filter(Boolean).join('\n');
}

function formatContacts(contacts = []) {
  if (!contacts.length) return 'У филиала нет контактов.';

  return contacts.map((contact, index) => {
    return [
      `${index + 1}. ${contact.contact_type || 'Контакт'} (#${contact.id})`,
      contact.fio ? `ФИО: ${contact.fio}` : null,
      contact.phone ? `Телефон: ${contact.phone}` : null,
      contact.telegram ? `Telegram: ${contact.telegram}` : null,
      contact.email ? `Email: ${contact.email}` : null
    ].filter(Boolean).join('\n');
  }).join('\n\n');
}

function formatBranchList(branches = []) {
  return branches.map((branch, index) => {
    const line1 = `${index + 1}. #${branch.id} — ${branch.iiko?.address_tt || 'без address_tt'}`;
    const line2 = branch.jur_lico ? `   ${branch.jur_lico}` : null;
    const line3 = branch.location?.address ? `   ${branch.location.address}` : null;
    return [line1, line2, line3].filter(Boolean).join('\n');
  }).join('\n\n');
}

function formatPartnerCard(partner) {
  const displayName = partner?.jur_info?.full_name_organization || partner?.fio || `Партнер #${partner?.id || '—'}`;
  return [
    `Партнер #${partner.id}`,
    displayName,
    partner.fio && partner.fio !== displayName ? `ФИО: ${partner.fio}` : null,
    partner.jur_info?.inn ? `ИНН: ${partner.jur_info.inn}` : null,
    partner.jur_info?.ogrn_ip ? `ОГРН/ОГРНИП: ${partner.jur_info.ogrn_ip}` : null,
    typeof partner.is_archived === 'boolean' ? `Архивный: ${partner.is_archived ? 'да' : 'нет'}` : null
  ].filter(Boolean).join('\n');
}

function formatPartnerList(partners = []) {
  return partners.map((partner, index) => {
    const displayName = partner?.jur_info?.full_name_organization || partner?.fio || 'без названия';
    const line1 = `${index + 1}. #${partner.id} — ${displayName}`;
    const line2 = partner?.fio && partner.fio !== displayName ? `   ФИО: ${partner.fio}` : null;
    const line3 = partner?.jur_info?.inn ? `   ИНН: ${partner.jur_info.inn}` : null;
    return [line1, line2, line3].filter(Boolean).join('\n');
  }).join('\n\n');
}

function formatPartnerContacts(contacts = []) {
  if (!contacts.length) return 'У партнера нет контактов.';

  return contacts.map((contact, index) => {
    return [
      `${index + 1}. Контакт партнера #${contact.id || '—'}`,
      contact.phone_1 ? `Телефон: ${contact.phone_1}` : null,
      contact.telegram ? `Telegram: ${contact.telegram}` : null,
      contact.email ? `Email: ${contact.email}` : null,
      contact.email_yandex ? `Yandex email: ${contact.email_yandex}` : null,
      contact.yandex_messenger_login ? `Логин Yandex Messenger: ${contact.yandex_messenger_login}` : null
    ].filter(Boolean).join('\n');
  }).join('\n\n');
}

function formatTerritoryCard(territory) {
  return [
    `Территория #${territory.id}`,
    territory.name ? `Название: ${territory.name}` : null,
    territory.territory_type ? `Тип: ${territory.territory_type}` : null
  ].filter(Boolean).join('\n');
}

function formatTerritoryList(territories = []) {
  return territories.map((territory, index) => {
    return [
      `${index + 1}. #${territory.id} — ${territory.name || 'без названия'}`,
      territory.territory_type ? `   Тип: ${territory.territory_type}` : null
    ].filter(Boolean).join('\n');
  }).join('\n\n');
}

function formatDuplicateJurLicoGroups(groups = []) {
  return groups.map((group, index) => {
    const header = `${index + 1}. ${group.displayName} — ${group.branches.length} филиал(ов)`;
    const items = group.branches.map((branch) => {
      return `   • #${branch.id} — ${branch.iiko?.address_tt || 'без address_tt'}${branch.location?.address ? ` — ${branch.location.address}` : ''}`;
    });

    return [header, ...items].join('\n');
  }).join('\n\n');
}

function formatSimilarJurLicoGroups(groups = []) {
  return groups.map((group, index) => {
    const header = `${index + 1}. Похожие юр. лица по ключу «${group.key}» — ${group.branches.length} филиал(ов)`;
    const variants = group.variants?.length
      ? `   Варианты: ${group.variants.join(' | ')}`
      : null;
    const items = group.branches.map((branch) => {
      return `   • #${branch.id} — ${branch.jur_lico || 'без jur_lico'}${branch.iiko?.address_tt ? ` — ${branch.iiko.address_tt}` : ''}${branch.location?.address ? ` — ${branch.location.address}` : ''}`;
    });

    return [header, variants, ...items].filter(Boolean).join('\n');
  }).join('\n\n');
}

module.exports = {
  formatBranchCard,
  formatContacts,
  formatBranchList,
  formatPartnerCard,
  formatPartnerList,
  formatPartnerContacts,
  formatTerritoryCard,
  formatTerritoryList,
  formatDuplicateJurLicoGroups,
  formatSimilarJurLicoGroups
};
