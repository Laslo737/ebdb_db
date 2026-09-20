const {
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
} = require('./formatters');

const CONTACT_FIELDS = {
  contact_type: 'Тип контакта',
  fio: 'ФИО',
  phone: 'Телефон',
  telegram: 'Telegram',
  email: 'Email (личный)',
  yandex_messenger_login: 'Логин Yandex Messenger',
  email_yandex: 'Yandex email',
  birthday: 'Дата рождения',
  clothes_size: 'Размер одежды'
};

const CONTACT_FIELD_ORDER = Object.keys(CONTACT_FIELDS);
const CONTACT_PAYLOAD_FIELDS = [...CONTACT_FIELD_ORDER, 'tg_user_id', 'is_using_in_tg_bot'];
const CREATE_CONTACT_FIELD_ORDER = ['contact_type', 'fio', 'phone', 'telegram', 'email', 'yandex_messenger_login'];
const PARTNER_CONTACT_FIELDS = {
  phone_1: 'Телефон',
  telegram: 'Telegram',
  email: 'Личный email',
  email_yandex: 'Почта учетки Yandex',
  yandex_messenger_login: 'Логин Yandex Messenger'
};
const PARTNER_CONTACT_FIELD_ORDER = Object.keys(PARTNER_CONTACT_FIELDS);
const BRANCH_CREATE_CONTACT_FIELD_ORDER = ['fio', 'phone', 'telegram', 'email', 'yandex_messenger_login'];
const BRANCH_CREATE_CONTACT_ROLES = [
  { type: 'Партнер №1', label: 'Партнер №1 (юридический партнер)' },
  { type: 'Партнер №2', label: 'Партнер №2 (фактический партнер)' },
  { type: 'Управляющий', label: 'Управляющий' }
];
const FILIAL_STATUS_OPTIONS = ['Запускается', 'Открыт', 'На стопе', 'Не передано в запуск', 'Закрыт', 'Отказ'];
const FILIAL_TYPE_OPTIONS = ['РС', 'ФС'];
const VNUTRENNIY_PRIZNAK_OPTIONS = ['РФ', 'Казахстан', 'Беларусь', 'Расторгнутые', 'ТиЧ', 'Взыскание'];
const FILIAL_CATEGORY_OPTIONS = ['A', 'B', 'C'];
const KEEP_CURRENT_BUTTON = { text: 'Оставить текущее' };
const CLEAR_VALUE_BUTTON = { text: 'Сделать пустым' };
const SKIP_VALUE_BUTTON = { text: 'Оставить пустым' };
const EDIT_ALL_CONTACT_FIELDS_BUTTON = { text: 'изменить все поля' };
const MAIN_MENU_BUTTONS = [
  { text: 'найти филиал' },
  { text: 'создать филиал' },
  { text: 'проверки' },
  { text: 'изменить партнера' },
  { text: 'меню' }
];
const BRANCH_ACTION_BUTTONS = [
  { text: 'контакты' },
  { text: 'изменить партнера' },
  { text: 'изменить контакт' },
  { text: 'добавить контакт' },
  { text: 'удалить контакт' },
  { text: 'изменить юр лицо' },
  { text: 'шаг назад' },
  { text: 'меню' }
];
const FLOW_CONTROL_BUTTONS = [
  { text: 'шаг назад' },
  { text: 'меню' }
];
const CONFIRM_BUTTONS = [
  { text: 'да' },
  { text: 'нет' },
  { text: 'шаг назад' },
  { text: 'меню' }
];
const CHECKS_MENU_BUTTONS = [
  { text: 'без iiko' },
  { text: 'дубли юр. лиц' },
  { text: 'похожие юр. лица' },
  { text: 'шаг назад' },
  { text: 'меню' }
];
const CHECKS_RESULT_LIMIT = 30;
const DUPLICATE_GROUPS_LIMIT = 20;
const SIMILAR_GROUPS_LIMIT = 20;

function getUserKey(event) {
  if (event.chat?.type === 'private') {
    return String(event.chat?.id || event.from?.login || event.from?.id || 'anonymous');
  }

  return String(event.chat?.id || event.from?.login || event.from?.id || 'anonymous');
}

function normalizeInput(value) {
  return String(value || '').trim();
}

function isCancel(text) {
  return /^(отмена|cancel|stop)$/i.test(normalizeInput(text));
}

function isStepBack(text) {
  return /^(шаг назад|назад|back)$/i.test(normalizeInput(text));
}

function isSkip(text) {
  return /^(-|пропустить|skip|оставить пустым)$/i.test(normalizeInput(text));
}

function isKeepCurrent(text) {
  return /^(оставить текущее|оставить как есть)$/i.test(normalizeInput(text));
}

function isClear(text) {
  return /^(-|очистить|clear|сделать пустым)$/i.test(normalizeInput(text));
}

function isNoValue(text) {
  return /^(нет|не знаю|неизвестно|unknown)$/i.test(normalizeInput(text));
}

function buildContactPayload(contact) {
  const payload = {};
  for (const field of CONTACT_PAYLOAD_FIELDS) {
    if (field in (contact || {})) {
      payload[field] = contact[field] ?? null;
    }
  }
  return payload;
}

function sanitizeContactSelection(text) {
  return normalizeInput(text).replace(/^#/, '');
}

function countSearchTokens(value) {
  return normalizeInput(value)
    .replace(/[_\-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function formatContactFields() {
  return [
    ...CONTACT_FIELD_ORDER.map((field, index) => `${index + 1}. ${CONTACT_FIELDS[field]} (${field})`),
    `${CONTACT_FIELD_ORDER.length + 1}. Изменить все поля по очереди`
  ].join('\n');
}

function buildNumberButtons(items = [], limit = 9) {
  return items.slice(0, limit).map((_, index) => ({ text: String(index + 1) }));
}

function buildFieldButtons(fields = CONTACT_FIELD_ORDER) {
  return [...fields.map((field) => ({ text: field })), EDIT_ALL_CONTACT_FIELDS_BUTTON];
}

function buildEditValueButtons({ allowKeepCurrent = false, allowClear = true } = {}) {
  const buttons = [];
  if (allowKeepCurrent) buttons.push(KEEP_CURRENT_BUTTON);
  if (allowClear) buttons.push(CLEAR_VALUE_BUTTON);
  return [...buttons, ...FLOW_CONTROL_BUTTONS];
}

function buildCreateContactButtons(field) {
  if (field === 'contact_type') {
    return [
      { text: 'Управляющий' },
      { text: 'Партнер №1' },
      { text: 'Партнер №2' },
      SKIP_VALUE_BUTTON,
      ...FLOW_CONTROL_BUTTONS
    ];
  }

  return [SKIP_VALUE_BUTTON, ...FLOW_CONTROL_BUTTONS];
}

function buildCreateContactPrompt(field, { isFirstStep = false } = {}) {
  const base = [`Введите значение для поля: ${CONTACT_FIELDS[field]}`];

  if (field === 'contact_type') {
    base.push('Можно нажать одну из кнопок ниже: Управляющий, Партнер №1 или Партнер №2.');
    base.push('Если поле не нужно заполнять, нажмите кнопку «Оставить пустым».');
  } else if (field === 'email') {
    base.push('Укажите личный email контакта. Если поле не нужно заполнять, нажмите кнопку «Оставить пустым».');
  } else if (field === 'yandex_messenger_login') {
    base.push('Укажите учетку Yandex Messenger, которая связана с данным филиалом. Например: moskva_2prof@desk.yobidoyobi.ru');
    base.push('Если поле не нужно заполнять, нажмите кнопку «Оставить пустым».');
  } else {
    base.push('Если поле не нужно заполнять, нажмите кнопку «Оставить пустым».');
  }

  if (isFirstStep) {
    base.push('Чтобы вернуться на шаг назад, напишите: шаг назад');
  }

  return base.join('\n');
}

function buildPartnerSelectionButtons(partners = [], limit = 9) {
  return [...buildNumberButtons(partners, limit), { text: 'Создать нового' }, ...FLOW_CONTROL_BUTTONS];
}

function buildPartnerContactPrompt(field, { isFirstStep = false } = {}) {
  const base = [`Введите значение для поля: ${PARTNER_CONTACT_FIELDS[field]}`];

  if (field === 'phone_1') {
    base.push('Укажите основной номер партнера. Если номера нет или не знаете — нажмите кнопку «Оставить пустым» или напишите: нет');
  } else if (field === 'email') {
    base.push('Укажите личную почту партнера. Если не нужно или не знаете — нажмите кнопку «Оставить пустым» или напишите: нет');
  } else if (field === 'email_yandex') {
    base.push('Укажите почту учетки Yandex. Если не нужно или не знаете — нажмите кнопку «Оставить пустым» или напишите: нет');
  } else if (field === 'yandex_messenger_login') {
    base.push('Укажите логин Yandex Messenger. Если не нужно или не знаете — нажмите кнопку «Оставить пустым» или напишите: нет');
  } else {
    base.push('Если поле не нужно или не знаете — нажмите кнопку «Оставить пустым» или напишите: нет');
  }

  if (isFirstStep) {
    base.push('Чтобы вернуться на шаг назад, напишите: шаг назад');
  }

  return base.join('\n');
}

function buildPartnerContactButtons() {
  return [SKIP_VALUE_BUTTON, ...FLOW_CONTROL_BUTTONS];
}

function validatePartnerContactFieldValue(field, value) {
  const normalized = normalizeInput(value);
  if (!normalized) return null;

  if (field === 'email' || field === 'email_yandex') {
    if (/\s/.test(normalized)) {
      return 'В email не должно быть пробелов. Проверьте адрес и отправьте его еще раз.';
    }

    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      return 'Похоже, это не email. Введите адрес в формате name@example.com.';
    }
  }

  if (field === 'yandex_messenger_login' && /\s/.test(normalized)) {
    return 'В логине Yandex Messenger не должно быть пробелов. Если это почта учетки, введите ее на шаге `Почта учетки Yandex`, а здесь укажите именно логин.';
  }

  return null;
}

function formatApiValidationDetails(error) {
  const details = Array.isArray(error?.data?.detail) ? error.data.detail : [];
  if (!details.length) return 'API вернул ошибку валидации.';

  return details.map((item) => {
    const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : null;
    return field ? `• ${field}: ${item?.msg || 'некорректное значение'}` : `• ${item?.msg || 'некорректное значение'}`;
  }).join('\n');
}

function buildChoiceButtons(options = [], { includeSkip = false } = {}) {
  return [
    ...options.map((option) => ({ text: option })),
    ...(includeSkip ? [SKIP_VALUE_BUTTON] : []),
    ...FLOW_CONTROL_BUTTONS
  ];
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function getPartnerDisplayName(partner) {
  return String(partner?.jur_info?.full_name_organization || partner?.fio || '').trim();
}

function cloneFlowSnapshot(flow) {
  const snapshot = { ...flow };
  delete snapshot.history;
  return JSON.parse(JSON.stringify(snapshot));
}

function buildBranchCreateContactPrompt(role, field, { isFirstStep = false } = {}) {
  const roleLabel = role?.label || role?.type || 'Контакт';
  const lines = [`${roleLabel}`, `Введите значение для поля: ${CONTACT_FIELDS[field]}`];

  if (field === 'email') {
    lines.push('Укажите личный email контакта или нажмите «Оставить пустым».');
  } else if (field === 'yandex_messenger_login') {
    lines.push('Укажите логин Yandex Messenger или нажмите «Оставить пустым».');
  } else {
    lines.push('Если данных нет, нажмите «Оставить пустым».');
  }

  if (isFirstStep) {
    lines.push('Чтобы вернуться на шаг назад, напишите: шаг назад');
  }

  return lines.join('\n');
}

function buildCreateBranchContactButtons() {
  return [SKIP_VALUE_BUTTON, ...FLOW_CONTROL_BUTTONS];
}

function buildDateButtons() {
  return [{ text: getTodayDateString() }, ...FLOW_CONTROL_BUTTONS];
}

function buildCreateOrUseButtons(items = [], createLabel = 'Создать нового') {
  return [...buildNumberButtons(items), { text: createLabel }, ...FLOW_CONTROL_BUTTONS];
}

function buildYesSkipButtons({ yesLabel = 'Да', skipLabel = 'Пропустить' } = {}) {
  return [{ text: yesLabel }, { text: skipLabel }, ...FLOW_CONTROL_BUTTONS];
}

function buildCreateBranchSummary(flow) {
  const branchInfo = [
    flow.addressTt ? `TT: ${flow.addressTt}` : null,
    flow.dateOpen ? `Дата открытия: ${flow.dateOpen}` : null,
    flow.status ? `Статус: ${flow.status}` : null,
    flow.category ? `Категория: ${flow.category}` : 'Категория: не указана',
    flow.filialType ? `Тип филиала: ${flow.filialType}` : null,
    flow.vnutrenniyPriznak ? `Внутренний признак: ${flow.vnutrenniyPriznak}` : null
  ].filter(Boolean);

  return [
    flow.partner ? ['Партнер:', formatPartnerCard(flow.partner)].join('\n') : null,
    flow.territory ? ['Территория:', formatTerritoryCard(flow.territory)].join('\n') : null,
    branchInfo.length ? ['Параметры филиала:', ...branchInfo].join('\n') : null
  ].filter(Boolean).join('\n\n');
}

function buildCreateBranchCategoryPrompt() {
  return [
    'Выберите категорию филиала.',
    'Можно нажать одну из кнопок ниже или пропустить этот шаг.'
  ].join('\n');
}

function buildCreateBranchContactRolePrompt(role, index, total) {
  return [
    `Контакт ${index + 1} из ${total}`,
    `Создать контакт филиала: ${role.label}?`,
    'Можно заполнить сейчас или пропустить.'
  ].join('\n');
}

function buildDuplicateBranchMessage(prefix, branches = []) {
  return [prefix, '', formatBranchList(branches)].join('\n');
}

function isYes(text) {
  return /^(да|yes)$/i.test(normalizeInput(text));
}

function isCreateNew(text) {
  return /^(создать нового|создать новую|создать новый|создать филиал|создать)$/i.test(normalizeInput(text));
}

function buildEditContactFieldPrompt(contact, field, { index = null, total = null } = {}) {
  const currentValue = contact?.[field] ?? 'не заполнено';
  const header = index != null && total != null
    ? `Поле ${index + 1} из ${total}: ${CONTACT_FIELDS[field]}`
    : `Поле: ${CONTACT_FIELDS[field]}`;

  return [
    header,
    `Текущее значение: ${currentValue}`,
    'Введите новое значение или воспользуйтесь кнопками ниже.',
    '• «Оставить текущее» — оставить как есть',
    '• «Сделать пустым» — записать пустое значение'
  ].join('\n');
}

class BotService {
  constructor({ branchService, sender, sessions }) {
    this.branchService = branchService;
    this.sender = sender;
    this.sessions = sessions;
  }

  async handleEvent(event) {
    if (event.type === 'system') return;
    if (!event.text?.trim()) {
      return this.sender.reply(event, {
        text: 'Сейчас я работаю только с текстом и кнопками. Нажмите кнопку ниже или напишите запрос на поиск филиала.'
      });
    }

    const text = event.text.trim();
    const userKey = getUserKey(event);
    const session = this.sessions.get(userKey);

    if (isCancel(text)) {
      this.sessions.clear(userKey);
      return this.sender.reply(event, {
        text: 'Готово, текущий сценарий отменен. Возвращаю в главное меню.',
        buttons: MAIN_MENU_BUTTONS
      });
    }

    if (/^(start|старт|help|помощь|menu|меню)$/i.test(text.replace(/^\//, ''))) {
      this.sessions.clear(userKey);
      return this.showHelp(event);
    }

    if (isStepBack(text)) {
      return this.handleStepBack(event, userKey, session);
    }

    if (session.flow) {
      return this.handleFlow(event, userKey, text, session.flow);
    }

    if (session.awaitingBranchSelection) {
      return this.handleBranchSelection(event, userKey, text, session);
    }

    if (session.awaitingCommandInput) {
      return this.handleAwaitingCommandInput(event, userKey, text, session.awaitingCommandInput);
    }

    if (/^(найти филиал|филиал|поиск)(?:\s|$)/i.test(text)) {
      return this.handleFindBranch(event, userKey, text);
    }

    if (/^создать филиал(?:\s|$)/i.test(text)) {
      return this.startCreateBranch(event, userKey, text);
    }

    if (/^контакты(?:\s|$)/i.test(text)) {
      return this.handleContactsShortcut(event, userKey, text);
    }

    if (/^изменить партнера(?:\s|$)/i.test(text)) {
      return this.startEditPartner(event, userKey, text);
    }

    if (/^изменить контакт(?:\s|$)/i.test(text)) {
      return this.startEditContact(event, userKey, text);
    }

    if (/^добавить контакт(?:\s|$)/i.test(text)) {
      return this.startAddContact(event, userKey, text);
    }

    if (/^удалить контакт(?:\s|$)/i.test(text)) {
      return this.startDeleteContact(event, userKey, text);
    }

    if (/^(изменить\s*юр\.?\s*лицо|изменить\s*юр\s*лицо)(?:\s|$)/i.test(text)) {
      return this.startEditJurLico(event, userKey, text);
    }

    if (/^(проверки|проверка|контроль)(?:\s|$)/i.test(text)) {
      return this.showChecksMenu(event, userKey);
    }

    if (/^(без\s*iiko|без\s*address_tt|нет\s*iiko)(?:\s|$)/i.test(text)) {
      return this.showBranchesWithoutIiko(event, userKey);
    }

    if (/^(дубли\s*юр\.?\s*лиц|дубли\s*юрлиц|дубли\s*jur_lico)(?:\s|$)/i.test(text)) {
      return this.showDuplicateJurLico(event, userKey);
    }

    if (/^(похожие\s*юр\.?\s*лица|похожие\s*юрлица|похожие\s*jur_lico)(?:\s|$)/i.test(text)) {
      return this.showSimilarJurLico(event, userKey);
    }

    return this.sender.reply(event, {
      text: [
        'Не понял команду.',
        '',
        'Попробуйте один из вариантов:',
        '• нажмите кнопку ниже',
        '• напишите: филиал 1211',
        '• напишите: создать филиал',
        '• напишите адрес ТТ, например: Москва_15 Люб',
        '• напишите ФИО / юр. лицо, например: Коваленко Ольга',
        '• напишите: меню'
      ].join('\n'),
      buttons: MAIN_MENU_BUTTONS
    });
  }

  async handleFlow(event, userKey, text, flow) {
    if (flow.type === 'checks') {
      if (/^(без\s*iiko|без\s*address_tt|нет\s*iiko)(?:\s|$)/i.test(text)) {
        return this.showBranchesWithoutIiko(event, userKey);
      }

      if (/^(дубли\s*юр\.?\s*лиц|дубли\s*юрлиц|дубли\s*jur_lico)(?:\s|$)/i.test(text)) {
        return this.showDuplicateJurLico(event, userKey);
      }

      if (/^(похожие\s*юр\.?\s*лица|похожие\s*юрлица|похожие\s*jur_lico)(?:\s|$)/i.test(text)) {
        return this.showSimilarJurLico(event, userKey);
      }

      return this.sender.reply(event, {
        text: 'Выберите проверку кнопкой ниже.',
        buttons: CHECKS_MENU_BUTTONS
      });
    }

    if (flow.type === 'edit_contact') {
      if (flow.step === 'select_contact') return this.handleEditContactSelect(event, userKey, text, flow);
      if (flow.step === 'select_field') return this.handleEditContactField(event, userKey, text, flow);
      if (flow.step === 'enter_value') return this.handleEditContactValue(event, userKey, text, flow);
      if (flow.step === 'edit_all_value') return this.handleEditContactAllValue(event, userKey, text, flow);
    }

    if (flow.type === 'create_branch') {
      return this.handleCreateBranchFlow(event, userKey, text, flow);
    }

    if (flow.type === 'add_contact') {
      return this.handleAddContactFlow(event, userKey, text, flow);
    }

    if (flow.type === 'delete_contact') {
      if (flow.step === 'select_contact') return this.handleDeleteContactSelect(event, userKey, text, flow);
      if (flow.step === 'confirm') return this.handleDeleteContactConfirm(event, userKey, text, flow);
    }

    if (flow.type === 'edit_jur_lico') {
      if (flow.step === 'enter_value') return this.handleEditJurLicoValue(event, userKey, text, flow);
    }

    if (flow.type === 'edit_partner') {
      return this.handleEditPartnerFlow(event, userKey, text, flow);
    }

    return this.sender.reply(event, {
      text: 'Не получилось продолжить этот шаг. Попробуйте нажать кнопку ниже или напишите: шаг назад',
      buttons: FLOW_CONTROL_BUTTONS
    });
  }

  async handleStepBack(event, userKey, session) {
    if (session.flow?.type === 'edit_contact') {
      if (session.flow.step === 'select_contact') {
        this.sessions.patch(userKey, { flow: null });
        return this.sender.reply(event, { text: 'Возвращаюсь к действиям по филиалу.', buttons: BRANCH_ACTION_BUTTONS });
      }

      if (session.flow.step === 'select_field') {
        this.sessions.patch(userKey, {
          flow: {
            ...session.flow,
            step: 'select_contact',
            selectedContactId: undefined,
            selectedContact: undefined,
            selectedField: undefined
          }
        });

        const contacts = await this.branchService.getContacts(session.flow.branchId);
        return this.sender.reply(event, {
          text: [
            'Выберите контакт, который хотите изменить.',
            'Можно нажать кнопку с номером или написать id контакта.',
            '',
            formatContacts(contacts)
          ].join('\n'),
          buttons: [...buildNumberButtons(contacts), ...FLOW_CONTROL_BUTTONS]
        });
      }

      if (session.flow.step === 'enter_value') {
        const selected = session.flow.selectedContact || await this.branchService.getContact(session.flow.selectedContactId);
        this.sessions.patch(userKey, {
          flow: {
            ...session.flow,
            step: 'select_field',
            selectedContact: selected,
            selectedField: undefined
          }
        });

        return this.sender.reply(event, {
          text: [
            `Выбран контакт #${selected.id}.`,
            'Какое поле хотите изменить?',
            formatContactFields(),
            '',
            'Можно написать номер поля, его код (например: phone) или нажать «изменить все поля».'
          ].join('\n'),
          buttons: [...buildFieldButtons(), ...FLOW_CONTROL_BUTTONS]
        });
      }

      if (session.flow.step === 'edit_all_value') {
        const selected = session.flow.selectedContact || await this.branchService.getContact(session.flow.selectedContactId);
        const currentIndex = session.flow.editAllIndex || 0;

        if (currentIndex <= 0) {
          this.sessions.patch(userKey, {
            flow: {
              ...session.flow,
              step: 'select_field',
              editAllIndex: undefined,
              draftPayload: undefined
            }
          });

          return this.sender.reply(event, {
            text: [
              `Выбран контакт #${selected.id}.`,
              'Какое поле хотите изменить?',
              formatContactFields(),
              '',
              'Можно написать номер поля, его код (например: phone) или нажать «изменить все поля».'
            ].join('\n'),
            buttons: [...buildFieldButtons(), ...FLOW_CONTROL_BUTTONS]
          });
        }

        const previousIndex = currentIndex - 1;
        const previousField = CONTACT_FIELD_ORDER[previousIndex];
        this.sessions.patch(userKey, {
          flow: {
            ...session.flow,
            step: 'edit_all_value',
            editAllIndex: previousIndex
          }
        });

        const draftContact = {
          ...(selected || {}),
          ...(session.flow.draftPayload || {})
        };

        return this.sender.reply(event, {
          text: buildEditContactFieldPrompt(draftContact, previousField, {
            index: previousIndex,
            total: CONTACT_FIELD_ORDER.length
          }),
          buttons: buildEditValueButtons({ allowKeepCurrent: true, allowClear: true })
        });
      }
    }

    if (session.flow?.type === 'add_contact') {
      if ((session.flow.fieldIndex || 0) <= 0) {
        this.sessions.patch(userKey, { flow: null });
        return this.sender.reply(event, { text: 'Возвращаюсь к действиям по филиалу.', buttons: BRANCH_ACTION_BUTTONS });
      }

      const previousIndex = session.flow.fieldIndex - 1;
      const previousField = CREATE_CONTACT_FIELD_ORDER[previousIndex];
      const payload = { ...(session.flow.payload || {}) };
      delete payload[CREATE_CONTACT_FIELD_ORDER[session.flow.fieldIndex]];
      delete payload[previousField];

      this.sessions.patch(userKey, {
        flow: {
          ...session.flow,
          fieldIndex: previousIndex,
          payload
        }
      });

      return this.sender.reply(event, {
        text: buildCreateContactPrompt(previousField),
        buttons: buildCreateContactButtons(previousField)
      });
    }

    if (session.flow?.type === 'delete_contact') {
      if (session.flow.step === 'select_contact') {
        this.sessions.patch(userKey, { flow: null });
        return this.sender.reply(event, { text: 'Возвращаюсь к действиям по филиалу.', buttons: BRANCH_ACTION_BUTTONS });
      }

      if (session.flow.step === 'confirm') {
        this.sessions.patch(userKey, {
          flow: {
            ...session.flow,
            step: 'select_contact',
            selectedContactId: undefined,
            selectedContact: undefined
          }
        });

        const contacts = await this.branchService.getContacts(session.flow.branchId);
        return this.sender.reply(event, {
          text: [
            'Выберите контакт, который хотите удалить.',
            'Можно нажать кнопку с номером или написать id контакта.',
            '',
            formatContacts(contacts)
          ].join('\n'),
          buttons: [...buildNumberButtons(contacts), ...FLOW_CONTROL_BUTTONS]
        });
      }
    }

    if (session.flow?.type === 'edit_jur_lico') {
      this.sessions.patch(userKey, { flow: null });
      return this.sender.reply(event, { text: 'Возвращаюсь к действиям по филиалу.', buttons: BRANCH_ACTION_BUTTONS });
    }

    if (session.flow?.type === 'edit_partner') {
      if (session.flow.step === 'enter_partner_query') {
        this.sessions.patch(userKey, { flow: null });
        return this.sender.reply(event, { text: 'Возвращаюсь к действиям по филиалу.', buttons: BRANCH_ACTION_BUTTONS });
      }

      if (session.flow.step === 'select_partner') {
        this.sessions.patch(userKey, {
          flow: {
            ...session.flow,
            step: 'enter_partner_query',
            foundPartners: [],
            selectedPartner: undefined,
            newPartnerFio: undefined,
            partnerContactPayload: {}
          }
        });

        return this.sender.reply(event, {
          text: 'Введите ФИО / имя нового или существующего партнера. Можно писать с префиксами вроде ИП — я попробую найти партнера по нормализованному ФИО.',
          buttons: FLOW_CONTROL_BUTTONS
        });
      }

      if (session.flow.step === 'enter_new_partner_fio') {
        this.sessions.patch(userKey, {
          flow: {
            ...session.flow,
            step: 'select_partner',
            newPartnerFio: undefined,
            partnerContactPayload: {}
          }
        });

        const partners = Array.isArray(session.flow.foundPartners) ? session.flow.foundPartners : [];
        return this.sender.reply(event, {
          text: partners.length
            ? [
                'Возвращаю к найденным вариантам партнера.',
                '',
                this.formatPartnerCandidatesMessage(partners)
              ].join('\n')
            : 'Возвращаю к выбору партнера.',
          buttons: buildPartnerSelectionButtons(partners)
        });
      }

      if (session.flow.step === 'enter_partner_contact_value') {
        const previousIndex = (session.flow.partnerContactFieldIndex || 0) - 1;
        if (previousIndex < 0) {
          this.sessions.patch(userKey, {
            flow: {
              ...session.flow,
              step: 'enter_new_partner_fio',
              partnerContactFieldIndex: 0,
              partnerContactPayload: {}
            }
          });

          return this.sender.reply(event, {
            text: 'Введите ФИО нового партнера полностью. Например: Малова Майя Михайловна',
            buttons: FLOW_CONTROL_BUTTONS
          });
        }

        const payload = { ...(session.flow.partnerContactPayload || {}) };
        delete payload[PARTNER_CONTACT_FIELD_ORDER[session.flow.partnerContactFieldIndex || 0]];
        delete payload[PARTNER_CONTACT_FIELD_ORDER[previousIndex]];
        const previousField = PARTNER_CONTACT_FIELD_ORDER[previousIndex];

        this.sessions.patch(userKey, {
          flow: {
            ...session.flow,
            step: 'enter_partner_contact_value',
            partnerContactFieldIndex: previousIndex,
            partnerContactPayload: payload
          }
        });

        return this.sender.reply(event, {
          text: buildPartnerContactPrompt(previousField, { isFirstStep: previousIndex === 0 }),
          buttons: buildPartnerContactButtons()
        });
      }
    }

    if (session.flow?.type === 'create_branch') {
      return this.handleCreateBranchStepBack(event, userKey, session.flow);
    }

    if (session.flow?.type === 'checks') {
      if (session.flow.step === 'result') {
        return this.showChecksMenu(event, userKey);
      }

      this.sessions.patch(userKey, { flow: null });
      return this.sender.reply(event, { text: 'Возвращаю в главное меню.', buttons: MAIN_MENU_BUTTONS });
    }

    if (session.awaitingBranchSelection || session.awaitingCommandInput) {
      this.sessions.patch(userKey, {
        awaitingBranchSelection: false,
        awaitingCommandInput: null,
        foundBranches: []
      });
      const buttons = session.selectedBranchId ? BRANCH_ACTION_BUTTONS : MAIN_MENU_BUTTONS;
      return this.sender.reply(event, { text: 'Этот шаг отменен. Возвращаю доступные действия.', buttons });
    }

    return this.sender.reply(event, { text: 'Сейчас некуда возвращаться. Можно выбрать действие в меню ниже.', buttons: MAIN_MENU_BUTTONS });
  }

  async showChecksMenu(event, userKey) {
    this.sessions.patch(userKey, {
      flow: {
        type: 'checks',
        step: 'menu'
      }
    });

    return this.sender.reply(event, {
      text: [
        'Раздел проверок.',
        '',
        'Сейчас доступно:',
        '• без iiko — показать филиалы, у которых не заполнен `iiko.address_tt`',
        '• дубли юр. лиц — строгие дубли по нормализованному `jur_lico`',
        '• похожие юр. лица — потенциально похожие записи по фамилии + имени',
        '',
        'Позже сюда можно добавить дубли филиалов и другие служебные выборки.'
      ].join('\n'),
      buttons: CHECKS_MENU_BUTTONS
    });
  }

  async showBranchesWithoutIiko(event, userKey) {
    const branches = await this.branchService.getBranchesWithoutAddressTt();
    this.sessions.patch(userKey, {
      flow: {
        type: 'checks',
        step: 'result',
        check: 'without_iiko'
      }
    });

    if (!branches.length) {
      return this.sender.reply(event, {
        text: 'Отлично: филиалов без `iiko.address_tt` не найдено.',
        buttons: CHECKS_MENU_BUTTONS
      });
    }

    const visible = branches.slice(0, CHECKS_RESULT_LIMIT);
    const hasMore = branches.length > visible.length;

    return this.sender.reply(event, {
      text: [
        `Нашел ${branches.length} филиалов без iiko/address_tt.`,
        hasMore ? `Показываю первые ${visible.length}.` : 'Показываю весь список.',
        '',
        formatBranchList(visible),
        '',
        'Можно нажать «шаг назад», чтобы вернуться к списку проверок.'
      ].join('\n'),
      buttons: CHECKS_MENU_BUTTONS
    });
  }

  async showDuplicateJurLico(event, userKey) {
    const groups = await this.branchService.getDuplicateJurLicoGroups();
    this.sessions.patch(userKey, {
      flow: {
        type: 'checks',
        step: 'result',
        check: 'duplicate_jur_lico'
      }
    });

    if (!groups.length) {
      return this.sender.reply(event, {
        text: 'Отлично: дублей по юр. лицам не найдено.',
        buttons: CHECKS_MENU_BUTTONS
      });
    }

    const visible = groups.slice(0, DUPLICATE_GROUPS_LIMIT);
    const hasMore = groups.length > visible.length;

    return this.sender.reply(event, {
      text: [
        `Нашел ${groups.length} групп дублей по юр. лицам.`,
        hasMore ? `Показываю первые ${visible.length} групп.` : 'Показываю все найденные группы.',
        '',
        formatDuplicateJurLicoGroups(visible),
        '',
        'Можно нажать «шаг назад», чтобы вернуться к списку проверок.'
      ].join('\n'),
      buttons: CHECKS_MENU_BUTTONS
    });
  }

  async showSimilarJurLico(event, userKey) {
    const groups = await this.branchService.getSimilarJurLicoGroups();
    this.sessions.patch(userKey, {
      flow: {
        type: 'checks',
        step: 'result',
        check: 'similar_jur_lico'
      }
    });

    if (!groups.length) {
      return this.sender.reply(event, {
        text: 'Похожих юр. лиц не найдено.',
        buttons: CHECKS_MENU_BUTTONS
      });
    }

    const visible = groups.slice(0, SIMILAR_GROUPS_LIMIT);
    const hasMore = groups.length > visible.length;

    return this.sender.reply(event, {
      text: [
        `Нашел ${groups.length} групп похожих юр. лиц.`,
        hasMore ? `Показываю первые ${visible.length} групп.` : 'Показываю все найденные группы.',
        '',
        formatSimilarJurLicoGroups(visible),
        '',
        'Это не строгие дубли, а кандидаты на ручную проверку.',
        'Можно нажать «шаг назад», чтобы вернуться к списку проверок.'
      ].join('\n'),
      buttons: CHECKS_MENU_BUTTONS
    });
  }

  async loadPartnerWithContacts(partnerId) {
    if (!partnerId) {
      return { partner: null, contacts: [] };
    }

    const [partner, contacts] = await Promise.all([
      this.branchService.getPartner(partnerId),
      this.branchService.getPartnerContacts(partnerId).catch(() => [])
    ]);

    return {
      partner,
      contacts: Array.isArray(contacts) ? contacts : []
    };
  }

  formatPartnerCandidatesMessage(candidates = []) {
    if (!candidates.length) return 'Подходящих партнеров не найдено.';

    return candidates.map((item, index) => {
      return [
        `${index + 1}.`,
        formatPartnerCard(item.partner),
        'Контакты партнера:',
        formatPartnerContacts(item.contacts)
      ].join('\n');
    }).join('\n\n');
  }

  async buildBranchDetailsText(branch, { includeActionsHint = false } = {}) {
    const [branchContacts, partnerData] = await Promise.all([
      this.branchService.getContacts(branch.id).catch(() => []),
      this.loadPartnerWithContacts(branch.partner_id).catch(() => ({ partner: null, contacts: [] }))
    ]);

    const lines = [
      formatBranchCard(branch),
      '',
      'Партнер филиала:',
      partnerData.partner ? formatPartnerCard(partnerData.partner) : (branch.partner_id ? `Не удалось загрузить партнера #${branch.partner_id}.` : 'Не привязан.'),
      '',
      'Контакты партнера:',
      partnerData.partner ? formatPartnerContacts(partnerData.contacts) : 'У партнера нет данных или он не привязан.',
      '',
      'Контакты филиала:',
      formatContacts(Array.isArray(branchContacts) ? branchContacts : [])
    ];

    if (includeActionsHint) {
      lines.push('', 'Что можно сделать дальше: посмотреть контакты, изменить партнера, изменить контакт, добавить контакт, удалить контакт или изменить юр лицо.', 'Можно нажать кнопку ниже.');
    }

    return lines.join('\n');
  }

  async buildCurrentBranchContextText(branchId) {
    if (!branchId) return '';

    try {
      const branch = await this.branchService.getBranch(branchId);
      return [
        'Текущий филиал',
        '──────────',
        formatBranchCard(branch)
      ].join('\n');
    } catch {
      return `Текущий филиал: #${branchId}`;
    }
  }

  patchCreateBranchFlow(userKey, flow, patch, { pushHistory = true } = {}) {
    const history = Array.isArray(flow.history) ? [...flow.history] : [];
    if (pushHistory) {
      history.push(cloneFlowSnapshot(flow));
    }

    this.sessions.patch(userKey, {
      flow: {
        ...flow,
        ...patch,
        history
      }
    });
  }

  async renderCreateBranchStep(event, userKey, flow, { isStepBack = false } = {}) {
    if (flow.step === 'enter_partner_query') {
      return this.sender.reply(event, {
        text: 'Введите ФИО / юр. лицо партнера для нового филиала. Я попробую найти похожие записи.',
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    if (flow.step === 'select_partner') {
      const candidates = Array.isArray(flow.foundPartners) ? flow.foundPartners : [];
      return this.sender.reply(event, {
        text: candidates.length
          ? [
              isStepBack ? 'Возвращаю к выбору партнера.' : 'Выберите партнера или создайте нового.',
              '',
              this.formatPartnerCandidatesMessage(candidates)
            ].join('\n')
          : 'Выберите партнера или создайте нового.',
        buttons: buildCreateOrUseButtons(candidates, 'Создать нового')
      });
    }

    if (flow.step === 'enter_new_partner_fio') {
      return this.sender.reply(event, {
        text: 'Введите ФИО / юр. лицо нового партнера полностью.',
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    if (flow.step === 'confirm_partner_contact') {
      return this.sender.reply(event, {
        text: [
          flow.partnerContactPromptTitle || 'Партнер выбран.',
          '',
          formatPartnerCard(flow.partner),
          '',
          flow.partnerContactPromptText || 'Заполнить контакт партнера сейчас?'
        ].join('\n'),
        buttons: buildYesSkipButtons({ yesLabel: 'Да', skipLabel: 'Пропустить' })
      });
    }

    if (flow.step === 'enter_partner_contact_value') {
      const field = PARTNER_CONTACT_FIELD_ORDER[flow.partnerContactFieldIndex || 0];
      return this.sender.reply(event, {
        text: buildPartnerContactPrompt(field, { isFirstStep: (flow.partnerContactFieldIndex || 0) === 0 }),
        buttons: buildPartnerContactButtons()
      });
    }

    if (flow.step === 'enter_territory_name') {
      return this.sender.reply(event, {
        text: 'Введите название территории для нового филиала, например: Великие Луки, Псков.',
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    if (flow.step === 'select_territory') {
      const territories = Array.isArray(flow.foundTerritories) ? flow.foundTerritories : [];
      return this.sender.reply(event, {
        text: territories.length
          ? [
              isStepBack ? 'Возвращаю к выбору территории.' : 'Нашел похожие территории. Выберите существующую или создайте новую.',
              '',
              formatTerritoryList(territories)
            ].join('\n')
          : `Подходящих территорий по запросу «${flow.territoryQuery}» не нашел. Можно создать новую.`,
        buttons: buildCreateOrUseButtons(territories, 'Создать новую')
      });
    }

    if (flow.step === 'enter_address_tt') {
      return this.sender.reply(event, {
        text: 'Введите address_tt / название ТТ для проверки дублей и будущего IIKO, например: Химки_2 Лен.',
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    if (flow.step === 'select_duplicate_branch') {
      const candidates = Array.isArray(flow.duplicateCandidates) ? flow.duplicateCandidates : [];
      return this.sender.reply(event, {
        text: flow.duplicateMessage || 'Найдены похожие филиалы. Используйте один из них или создайте новый.',
        buttons: buildCreateOrUseButtons(candidates, 'Создать новый')
      });
    }

    if (flow.step === 'enter_date_open') {
      return this.sender.reply(event, {
        text: 'Введите дату открытия филиала в формате YYYY-MM-DD или нажмите кнопку с сегодняшней датой.',
        buttons: buildDateButtons()
      });
    }

    if (flow.step === 'select_status') {
      return this.sender.reply(event, {
        text: 'Выберите статус филиала.',
        buttons: buildChoiceButtons(FILIAL_STATUS_OPTIONS)
      });
    }

    if (flow.step === 'select_category') {
      return this.sender.reply(event, {
        text: buildCreateBranchCategoryPrompt(),
        buttons: buildChoiceButtons(FILIAL_CATEGORY_OPTIONS, { includeSkip: true })
      });
    }

    if (flow.step === 'select_filial_type') {
      return this.sender.reply(event, {
        text: 'Выберите тип филиала.',
        buttons: buildChoiceButtons(FILIAL_TYPE_OPTIONS)
      });
    }

    if (flow.step === 'select_vnutrenniy_priznak') {
      return this.sender.reply(event, {
        text: 'Выберите внутренний признак филиала.',
        buttons: buildChoiceButtons(VNUTRENNIY_PRIZNAK_OPTIONS)
      });
    }

    if (flow.step === 'branch_contact_decision') {
      const roleIndex = flow.branchContactRoleIndex || 0;
      const role = BRANCH_CREATE_CONTACT_ROLES[roleIndex];
      return this.sender.reply(event, {
        text: buildCreateBranchContactRolePrompt(role, roleIndex, BRANCH_CREATE_CONTACT_ROLES.length),
        buttons: buildYesSkipButtons({ yesLabel: 'Заполнить', skipLabel: 'Пропустить' })
      });
    }

    if (flow.step === 'branch_contact_value') {
      const roleIndex = flow.branchContactRoleIndex || 0;
      const fieldIndex = flow.branchContactFieldIndex || 0;
      return this.sender.reply(event, {
        text: buildBranchCreateContactPrompt(BRANCH_CREATE_CONTACT_ROLES[roleIndex], BRANCH_CREATE_CONTACT_FIELD_ORDER[fieldIndex], {
          isFirstStep: fieldIndex === 0
        }),
        buttons: buildCreateBranchContactButtons()
      });
    }

    return this.sender.reply(event, {
      text: 'Не получилось продолжить создание филиала. Нажмите «шаг назад» или «меню».',
      buttons: FLOW_CONTROL_BUTTONS
    });
  }

  async handleCreateBranchStepBack(event, userKey, flow) {
    const history = Array.isArray(flow.history) ? flow.history : [];
    if (!history.length) {
      if (flow.createdBranchId) {
        this.sessions.patch(userKey, { flow: null, awaitingCommandInput: null, selectedBranchId: flow.createdBranchId });
        return this.sender.reply(event, { text: 'Филиал уже создан. Возвращаю к действиям по нему.', buttons: BRANCH_ACTION_BUTTONS });
      }

      this.sessions.patch(userKey, { flow: null, awaitingCommandInput: null });
      return this.sender.reply(event, { text: 'Создание филиала отменено. Возвращаю в главное меню.', buttons: MAIN_MENU_BUTTONS });
    }

    const previous = history[history.length - 1];
    this.sessions.patch(userKey, {
      flow: {
        ...previous,
        history: history.slice(0, -1)
      }
    });

    return this.renderCreateBranchStep(event, userKey, {
      ...previous,
      history: history.slice(0, -1)
    }, { isStepBack: true });
  }

  async startCreateBranch(event, userKey, text) {
    const query = text.replace(/^создать филиал\s*/i, '').trim();
    this.sessions.patch(userKey, {
      awaitingCommandInput: null,
      flow: {
        type: 'create_branch',
        step: 'enter_partner_query',
        history: []
      }
    });

    if (query) {
      return this.handleCreateBranchFlow(event, userKey, query, this.sessions.get(userKey).flow);
    }

    return this.sender.reply(event, {
      text: [
        'Начинаем создание нового филиала.',
        'Сначала найдем или создадим партнера.',
        '',
        'Введите ФИО / юр. лицо партнера.'
      ].join('\n'),
      buttons: FLOW_CONTROL_BUTTONS
    });
  }

  async proceedCreateBranchToTerritory(event, userKey, flow, prefixLines = []) {
    this.patchCreateBranchFlow(userKey, flow, {
      step: 'enter_territory_name'
    });

    return this.sender.reply(event, {
      text: [...prefixLines, 'Введите название территории для нового филиала, например: Великие Луки, Псков.'].filter(Boolean).join('\n\n'),
      buttons: FLOW_CONTROL_BUTTONS
    });
  }

  async handleCreateBranchFlow(event, userKey, text, flow) {
    if (flow.step === 'enter_partner_query') return this.handleCreateBranchPartnerSearch(event, userKey, text, flow);
    if (flow.step === 'select_partner') return this.handleCreateBranchPartnerSelect(event, userKey, text, flow);
    if (flow.step === 'enter_new_partner_fio') return this.handleCreateBranchPartnerCreate(event, userKey, text, flow);
    if (flow.step === 'confirm_partner_contact') return this.handleCreateBranchPartnerContactDecision(event, userKey, text, flow);
    if (flow.step === 'enter_partner_contact_value') return this.handleCreateBranchPartnerContactValue(event, userKey, text, flow);
    if (flow.step === 'enter_territory_name') return this.handleCreateBranchTerritorySearch(event, userKey, text, flow);
    if (flow.step === 'select_territory') return this.handleCreateBranchTerritorySelect(event, userKey, text, flow);
    if (flow.step === 'enter_address_tt') return this.handleCreateBranchAddressTt(event, userKey, text, flow);
    if (flow.step === 'select_duplicate_branch') return this.handleCreateBranchDuplicateSelect(event, userKey, text, flow);
    if (flow.step === 'enter_date_open') return this.handleCreateBranchDateOpen(event, userKey, text, flow);
    if (flow.step === 'select_status') return this.handleCreateBranchStatus(event, userKey, text, flow);
    if (flow.step === 'select_category') return this.handleCreateBranchCategory(event, userKey, text, flow);
    if (flow.step === 'select_filial_type') return this.handleCreateBranchFilialType(event, userKey, text, flow);
    if (flow.step === 'select_vnutrenniy_priznak') return this.handleCreateBranchVnutrenniyPriznak(event, userKey, text, flow);
    if (flow.step === 'branch_contact_decision') return this.handleCreateBranchContactDecision(event, userKey, text, flow);
    if (flow.step === 'branch_contact_value') return this.handleCreateBranchContactValue(event, userKey, text, flow);

    return this.sender.reply(event, {
      text: 'Не получилось продолжить создание филиала. Нажмите «шаг назад» или «меню».',
      buttons: FLOW_CONTROL_BUTTONS
    });
  }

  async handleCreateBranchPartnerSearch(event, userKey, text, flow) {
    const query = normalizeInput(text);
    if (!query) {
      return this.renderCreateBranchStep(event, userKey, flow);
    }

    const partners = await this.branchService.searchPartners(query);
    if (!partners.length) {
      this.patchCreateBranchFlow(userKey, flow, {
        step: 'enter_new_partner_fio',
        partnerQuery: query,
        foundPartners: []
      });

      return this.sender.reply(event, {
        text: [
          `По запросу «${query}» партнеров не нашел.`,
          'Введите юр. лицо / ФИО нового партнера полностью.'
        ].join('\n'),
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    const candidates = await Promise.all(partners.slice(0, 9).map(async (partner) => ({
      partner,
      contacts: await this.branchService.getPartnerContacts(partner.id).catch(() => [])
    })));

    this.patchCreateBranchFlow(userKey, flow, {
      step: 'select_partner',
      partnerQuery: query,
      foundPartners: candidates
    });

    return this.sender.reply(event, {
      text: [
        candidates.length === 1
          ? 'Нашел одного похожего партнера. Использовать его или создать нового?'
          : `Нашел ${partners.length} похожих партнеров. Выберите нужного или создайте нового.`,
        '',
        this.formatPartnerCandidatesMessage(candidates)
      ].join('\n'),
      buttons: buildCreateOrUseButtons(candidates, 'Создать нового')
    });
  }

  async handleCreateBranchPartnerSelect(event, userKey, text, flow) {
    const normalized = normalizeInput(text);
    if (isCreateNew(normalized)) {
      this.patchCreateBranchFlow(userKey, flow, {
        step: 'enter_new_partner_fio'
      });
      return this.renderCreateBranchStep(event, userKey, { ...flow, step: 'enter_new_partner_fio' });
    }

    const candidates = Array.isArray(flow.foundPartners) ? flow.foundPartners : [];
    const byIndex = Number(normalized);
    const selected = Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= candidates.length
      ? candidates[byIndex - 1]
      : candidates.find((item) => String(item?.partner?.id) === normalized);

    if (!selected?.partner?.id) {
      return this.sender.reply(event, {
        text: 'Не удалось распознать выбор. Нажмите кнопку с номером партнера или «Создать нового».',
        buttons: buildCreateOrUseButtons(candidates, 'Создать нового')
      });
    }

    const jurLico = getPartnerDisplayName(selected.partner) || flow.partnerQuery || '';
    const contacts = Array.isArray(selected.contacts) ? selected.contacts : [];

    if (!contacts.length) {
      this.patchCreateBranchFlow(userKey, flow, {
        step: 'confirm_partner_contact',
        partner: selected.partner,
        partnerContacts: [],
        jurLico,
        partnerContactPromptTitle: 'Выбран существующий партнер без контактов.',
        partnerContactPromptText: 'У этого партнера пока нет контактов. Заполнить контакт партнера сейчас?'
      });

      return this.sender.reply(event, {
        text: [
          'Выбран существующий партнер.',
          '',
          formatPartnerCard(selected.partner),
          '',
          'У партнера пока нет контактов.',
          'Заполнить контакт партнера сейчас?'
        ].join('\n'),
        buttons: buildYesSkipButtons({ yesLabel: 'Да', skipLabel: 'Пропустить' })
      });
    }

    return this.proceedCreateBranchToTerritory(event, userKey, {
      ...flow,
      partner: selected.partner,
      partnerContacts: contacts,
      jurLico
    }, [
      'Выбран существующий партнер.',
      formatPartnerCard(selected.partner),
      'Контакты партнера:',
      formatPartnerContacts(contacts)
    ]);
  }

  async handleCreateBranchPartnerCreate(event, userKey, text, flow) {
    const fio = normalizeInput(text);
    if (!fio) {
      return this.renderCreateBranchStep(event, userKey, flow);
    }

    const partner = await this.branchService.createPartner({ fio });
    this.patchCreateBranchFlow(userKey, flow, {
      step: 'confirm_partner_contact',
      partner,
      partnerContacts: [],
      jurLico: getPartnerDisplayName(partner) || fio,
      partnerContactPromptTitle: 'Создал нового партнера.',
      partnerContactPromptText: 'Заполнить контакт партнера сейчас?'
    });

    return this.sender.reply(event, {
      text: [
        'Создал нового партнера.',
        '',
        formatPartnerCard(partner),
        '',
        'Заполнить контакт партнера сейчас?'
      ].join('\n'),
      buttons: buildYesSkipButtons({ yesLabel: 'Да', skipLabel: 'Пропустить' })
    });
  }

  async handleCreateBranchPartnerContactDecision(event, userKey, text, flow) {
    if (isYes(text)) {
      this.patchCreateBranchFlow(userKey, flow, {
        step: 'enter_partner_contact_value',
        partnerContactFieldIndex: 0,
        partnerContactPayload: {}
      });
      return this.renderCreateBranchStep(event, userKey, {
        ...flow,
        step: 'enter_partner_contact_value',
        partnerContactFieldIndex: 0
      });
    }

    if (isSkip(text) || isNoValue(text) || /^пропустить$/i.test(normalizeInput(text))) {
      return this.proceedCreateBranchToTerritory(event, userKey, flow, ['Контакт партнера пропущен.']);
    }

    return this.sender.reply(event, {
      text: 'Нажмите «Да», если хотите заполнить контакт партнера, или «Пропустить».',
      buttons: buildYesSkipButtons({ yesLabel: 'Да', skipLabel: 'Пропустить' })
    });
  }

  async handleCreateBranchPartnerContactValue(event, userKey, text, flow) {
    const fieldIndex = flow.partnerContactFieldIndex || 0;
    const field = PARTNER_CONTACT_FIELD_ORDER[fieldIndex];
    const payload = { ...(flow.partnerContactPayload || {}) };

    if (!isSkip(text) && !isNoValue(text)) {
      const validationError = validatePartnerContactFieldValue(field, text);
      if (validationError) {
        return this.sender.reply(event, {
          text: [validationError, '', buildPartnerContactPrompt(field, { isFirstStep: fieldIndex === 0 })].join('\n'),
          buttons: buildPartnerContactButtons()
        });
      }

      payload[field] = normalizeInput(text);
    }

    const nextIndex = fieldIndex + 1;
    if (nextIndex >= PARTNER_CONTACT_FIELD_ORDER.length) {
      const hasContactData = Object.values(payload).some((value) => String(value || '').trim());
      let createdContact = null;
      if (hasContactData) {
        try {
          createdContact = await this.branchService.createPartnerContact(flow.partner.id, payload);
        } catch (error) {
          if (error?.status === 422) {
            return this.sender.reply(event, {
              text: [
                'Не удалось создать контакт партнера: API вернул ошибку валидации.',
                formatApiValidationDetails(error),
                '',
                'Скорее всего, одно из полей заполнено в неверном формате. Нажмите «шаг назад» и исправьте значение.'
              ].join('\n'),
              buttons: buildPartnerContactButtons()
            });
          }

          throw error;
        }
      }

      return this.proceedCreateBranchToTerritory(event, userKey, {
        ...flow,
        partnerContacts: createdContact ? [createdContact] : []
      }, [
        createdContact ? 'Контакт партнера создан.' : 'Контакт партнера пропущен.',
        createdContact ? formatPartnerContacts([createdContact]) : null
      ].filter(Boolean));
    }

    this.patchCreateBranchFlow(userKey, flow, {
      step: 'enter_partner_contact_value',
      partnerContactFieldIndex: nextIndex,
      partnerContactPayload: payload
    });

    return this.sender.reply(event, {
      text: buildPartnerContactPrompt(PARTNER_CONTACT_FIELD_ORDER[nextIndex]),
      buttons: buildPartnerContactButtons()
    });
  }

  async handleCreateBranchTerritorySearch(event, userKey, text, flow) {
    const query = normalizeInput(text);
    if (!query) {
      return this.renderCreateBranchStep(event, userKey, flow);
    }

    const territories = await this.branchService.searchTerritories(query);
    this.patchCreateBranchFlow(userKey, flow, {
      step: 'select_territory',
      territoryQuery: query,
      foundTerritories: territories.slice(0, 9)
    });

    return this.renderCreateBranchStep(event, userKey, {
      ...flow,
      step: 'select_territory',
      territoryQuery: query,
      foundTerritories: territories.slice(0, 9)
    });
  }

  async handleCreateBranchTerritorySelect(event, userKey, text, flow) {
    const normalized = normalizeInput(text);
    const territories = Array.isArray(flow.foundTerritories) ? flow.foundTerritories : [];

    if (isCreateNew(normalized)) {
      const territory = await this.branchService.createTerritory({
        name: flow.territoryQuery,
        territory_type: 'Новая территория'
      });

      this.patchCreateBranchFlow(userKey, flow, {
        step: 'enter_address_tt',
        territory,
        foundTerritories: []
      });

      return this.sender.reply(event, {
        text: [
          'Создал новую территорию.',
          '',
          formatTerritoryCard(territory),
          '',
          'Теперь введите address_tt / название ТТ, например: Химки_2 Лен.'
        ].join('\n'),
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    const byIndex = Number(normalized);
    const selected = Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= territories.length
      ? territories[byIndex - 1]
      : territories.find((item) => String(item?.id) === normalized);

    if (!selected?.id) {
      return this.sender.reply(event, {
        text: 'Не удалось распознать выбор. Нажмите кнопку с номером территории или «Создать новую».',
        buttons: buildCreateOrUseButtons(territories, 'Создать новую')
      });
    }

    this.patchCreateBranchFlow(userKey, flow, {
      step: 'enter_address_tt',
      territory: selected,
      foundTerritories: []
    });

    return this.sender.reply(event, {
      text: [
        'Выбрана территория.',
        '',
        formatTerritoryCard(selected),
        '',
        'Теперь введите address_tt / название ТТ, например: Химки_2 Лен.'
      ].join('\n'),
      buttons: FLOW_CONTROL_BUTTONS
    });
  }

  async handleCreateBranchAddressTt(event, userKey, text, flow) {
    const addressTt = normalizeInput(text);
    if (!addressTt) {
      return this.renderCreateBranchStep(event, userKey, flow);
    }

    const duplicates = await this.branchService.getBranchDuplicatesForCreate({
      addressTt,
      jurLico: flow.jurLico
    });

    if (duplicates.byAddress.length || duplicates.byJurLico.length) {
      const candidates = duplicates.byAddress.length ? duplicates.byAddress : duplicates.byJurLico;
      const duplicateMessage = duplicates.byAddress.length
        ? buildDuplicateBranchMessage('Найден существующий филиал с таким address_tt. Можно использовать его вместо создания дубля.', candidates)
        : buildDuplicateBranchMessage('По address_tt дублей нет, но найден филиал с таким же юр. лицом. Можно использовать его или создать новый.', candidates);

      this.patchCreateBranchFlow(userKey, flow, {
        step: 'select_duplicate_branch',
        addressTt,
        duplicateCandidates: candidates.slice(0, 9),
        duplicateMessage
      });

      return this.sender.reply(event, {
        text: duplicateMessage,
        buttons: buildCreateOrUseButtons(candidates.slice(0, 9), 'Создать новый')
      });
    }

    this.patchCreateBranchFlow(userKey, flow, {
      step: 'enter_date_open',
      addressTt,
      duplicateCandidates: [],
      duplicateMessage: null
    });

    return this.sender.reply(event, {
      text: 'Дублей по address_tt и юр. лицу не нашел. Теперь введите дату открытия филиала или нажмите кнопку с сегодняшней датой.',
      buttons: buildDateButtons()
    });
  }

  async handleCreateBranchDuplicateSelect(event, userKey, text, flow) {
    const normalized = normalizeInput(text);
    const candidates = Array.isArray(flow.duplicateCandidates) ? flow.duplicateCandidates : [];

    if (isCreateNew(normalized)) {
      this.patchCreateBranchFlow(userKey, flow, {
        step: 'enter_date_open'
      });
      return this.renderCreateBranchStep(event, userKey, {
        ...flow,
        step: 'enter_date_open'
      });
    }

    const byIndex = Number(normalized);
    const selected = Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= candidates.length
      ? candidates[byIndex - 1]
      : candidates.find((item) => String(item?.id) === normalized);

    if (!selected?.id) {
      return this.sender.reply(event, {
        text: 'Не удалось распознать выбор. Нажмите номер найденного филиала или «Создать новый».',
        buttons: buildCreateOrUseButtons(candidates, 'Создать новый')
      });
    }

    this.sessions.patch(userKey, {
      flow: null,
      selectedBranchId: selected.id,
      awaitingCommandInput: null,
      awaitingBranchSelection: false
    });

    return this.sender.reply(event, {
      text: [
        'Использую найденный филиал вместо создания нового.',
        await this.buildBranchDetailsText(await this.branchService.getBranch(selected.id), { includeActionsHint: true })
      ].join('\n'),
      buttons: BRANCH_ACTION_BUTTONS
    });
  }

  async handleCreateBranchDateOpen(event, userKey, text, flow) {
    const dateOpen = normalizeInput(text);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOpen)) {
      return this.sender.reply(event, {
        text: 'Введите дату в формате YYYY-MM-DD или нажмите кнопку с сегодняшней датой.',
        buttons: buildDateButtons()
      });
    }

    this.patchCreateBranchFlow(userKey, flow, {
      step: 'select_status',
      dateOpen
    });

    return this.renderCreateBranchStep(event, userKey, {
      ...flow,
      step: 'select_status',
      dateOpen
    });
  }

  async handleCreateBranchStatus(event, userKey, text, flow) {
    const value = normalizeInput(text);
    if (!FILIAL_STATUS_OPTIONS.includes(value)) {
      return this.sender.reply(event, {
        text: 'Выберите один из статусов кнопкой ниже.',
        buttons: buildChoiceButtons(FILIAL_STATUS_OPTIONS)
      });
    }

    this.patchCreateBranchFlow(userKey, flow, {
      step: 'select_category',
      status: value
    });

    return this.renderCreateBranchStep(event, userKey, {
      ...flow,
      step: 'select_category',
      status: value
    });
  }

  async handleCreateBranchCategory(event, userKey, text, flow) {
    const value = normalizeInput(text);
    const category = isSkip(text) ? null : value;
    if (!category && !isSkip(text)) {
      return this.sender.reply(event, {
        text: buildCreateBranchCategoryPrompt(),
        buttons: buildChoiceButtons(FILIAL_CATEGORY_OPTIONS, { includeSkip: true })
      });
    }

    this.patchCreateBranchFlow(userKey, flow, {
      step: 'select_filial_type',
      category
    });

    return this.renderCreateBranchStep(event, userKey, {
      ...flow,
      step: 'select_filial_type',
      category
    });
  }

  async handleCreateBranchFilialType(event, userKey, text, flow) {
    const value = normalizeInput(text);
    if (!FILIAL_TYPE_OPTIONS.includes(value)) {
      return this.sender.reply(event, {
        text: 'Выберите тип филиала кнопкой ниже.',
        buttons: buildChoiceButtons(FILIAL_TYPE_OPTIONS)
      });
    }

    this.patchCreateBranchFlow(userKey, flow, {
      step: 'select_vnutrenniy_priznak',
      filialType: value
    });

    return this.renderCreateBranchStep(event, userKey, {
      ...flow,
      step: 'select_vnutrenniy_priznak',
      filialType: value
    });
  }

  async handleCreateBranchVnutrenniyPriznak(event, userKey, text, flow) {
    const value = normalizeInput(text);
    if (!VNUTRENNIY_PRIZNAK_OPTIONS.includes(value)) {
      return this.sender.reply(event, {
        text: 'Выберите внутренний признак кнопкой ниже.',
        buttons: buildChoiceButtons(VNUTRENNIY_PRIZNAK_OPTIONS)
      });
    }

    const payload = {
      partner_id: flow.partner?.id ?? null,
      date_open: flow.dateOpen,
      jur_lico: flow.jurLico,
      territory_id: flow.territory?.id ?? null,
      status: flow.status,
      filial_type: flow.filialType,
      vnutrenniy_priznak_uo: value
    };

    if (flow.category) {
      payload.category = flow.category;
    }

    const createdBranch = await this.branchService.createBranch(payload);
    const createdIiko = await this.branchService.createBranchIiko(createdBranch.id, {
      address_tt: flow.addressTt
    }).catch(() => null);

    const createdBranchFull = await this.branchService.getBranch(createdBranch.id).catch(() => createdBranch);
    const nextFlow = {
      ...flow,
      step: 'branch_contact_decision',
      createdBranchId: createdBranch.id,
      createdBranch,
      createdBranchFull,
      vnutrenniyPriznak: value,
      branchContactRoleIndex: 0,
      branchContactFieldIndex: 0,
      branchContactPayload: {},
      history: []
    };

    this.sessions.patch(userKey, {
      selectedBranchId: createdBranch.id,
      flow: nextFlow,
      awaitingCommandInput: null,
      awaitingBranchSelection: false
    });

    return this.sender.reply(event, {
      text: [
        'Филиал создан.',
        createdIiko ? 'IIKO тоже создан.' : 'Филиал создан, но IIKO не удалось создать автоматически — его можно заполнить позже.',
        '',
        buildCreateBranchSummary({ ...flow, vnutrenniyPriznak: value }),
        '',
        'Теперь можно по желанию заполнить контакты филиала.'
      ].join('\n'),
      buttons: buildYesSkipButtons({ yesLabel: 'Заполнить', skipLabel: 'Пропустить' })
    });
  }

  async advanceCreateBranchContactRole(event, userKey, flow, prefixLines = []) {
    const nextRoleIndex = (flow.branchContactRoleIndex || 0) + 1;
    if (nextRoleIndex >= BRANCH_CREATE_CONTACT_ROLES.length) {
      this.sessions.patch(userKey, {
        selectedBranchId: flow.createdBranchId,
        flow: null,
        awaitingCommandInput: null,
        awaitingBranchSelection: false
      });

      return this.sender.reply(event, {
        text: [
          ...prefixLines,
          'Готово, сценарий создания филиала завершен.',
          '',
          await this.buildBranchDetailsText(await this.branchService.getBranch(flow.createdBranchId), { includeActionsHint: true })
        ].filter(Boolean).join('\n'),
        buttons: BRANCH_ACTION_BUTTONS
      });
    }

    const nextFlow = {
      ...flow,
      step: 'branch_contact_decision',
      branchContactRoleIndex: nextRoleIndex,
      branchContactFieldIndex: 0,
      branchContactPayload: {},
      history: []
    };

    this.sessions.patch(userKey, {
      flow: nextFlow,
      selectedBranchId: flow.createdBranchId
    });

    return this.sender.reply(event, {
      text: [...prefixLines, buildCreateBranchContactRolePrompt(BRANCH_CREATE_CONTACT_ROLES[nextRoleIndex], nextRoleIndex, BRANCH_CREATE_CONTACT_ROLES.length)].filter(Boolean).join('\n\n'),
      buttons: buildYesSkipButtons({ yesLabel: 'Заполнить', skipLabel: 'Пропустить' })
    });
  }

  async handleCreateBranchContactDecision(event, userKey, text, flow) {
    if (isYes(text) || /^заполнить$/i.test(normalizeInput(text))) {
      const role = BRANCH_CREATE_CONTACT_ROLES[flow.branchContactRoleIndex || 0];
      this.patchCreateBranchFlow(userKey, flow, {
        step: 'branch_contact_value',
        branchContactFieldIndex: 0,
        branchContactPayload: {
          contact_type: role.type
        }
      });
      return this.renderCreateBranchStep(event, userKey, {
        ...flow,
        step: 'branch_contact_value',
        branchContactFieldIndex: 0,
        branchContactPayload: {
          contact_type: role.type
        }
      });
    }

    if (isSkip(text) || isNoValue(text) || /^пропустить$/i.test(normalizeInput(text))) {
      return this.advanceCreateBranchContactRole(event, userKey, flow, ['Контакт пропущен.']);
    }

    return this.sender.reply(event, {
      text: 'Нажмите «Заполнить» или «Пропустить».',
      buttons: buildYesSkipButtons({ yesLabel: 'Заполнить', skipLabel: 'Пропустить' })
    });
  }

  async handleCreateBranchContactValue(event, userKey, text, flow) {
    const fieldIndex = flow.branchContactFieldIndex || 0;
    const field = BRANCH_CREATE_CONTACT_FIELD_ORDER[fieldIndex];
    const payload = { ...(flow.branchContactPayload || {}) };

    if (!isSkip(text)) {
      payload[field] = normalizeInput(text);
    }

    const nextIndex = fieldIndex + 1;
    if (nextIndex >= BRANCH_CREATE_CONTACT_FIELD_ORDER.length) {
      const created = await this.branchService.createContact(flow.createdBranchId, payload);
      return this.advanceCreateBranchContactRole(event, userKey, flow, [
        'Контакт филиала создан.',
        formatContacts([created])
      ]);
    }

    this.patchCreateBranchFlow(userKey, flow, {
      step: 'branch_contact_value',
      branchContactFieldIndex: nextIndex,
      branchContactPayload: payload
    });

    return this.sender.reply(event, {
      text: buildBranchCreateContactPrompt(BRANCH_CREATE_CONTACT_ROLES[flow.branchContactRoleIndex || 0], BRANCH_CREATE_CONTACT_FIELD_ORDER[nextIndex]),
      buttons: buildCreateBranchContactButtons()
    });
  }

  async startEditPartner(event, userKey, text) {
    const query = text.replace(/^изменить партнера\s*/i, '');
    if (!query && !this.sessions.get(userKey).selectedBranchId) {
      this.sessions.patch(userKey, {
        awaitingCommandInput: { type: 'edit_partner' }
      });
      return this.sender.reply(event, {
        text: 'Напишите адрес ТТ, id филиала или юр. лицо, у которого нужно изменить партнера.',
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    const resolved = await this.resolveBranchForCommand(userKey, query);
    if (resolved.error) return this.sender.reply(event, { text: resolved.error });

    const branchId = resolved.branchId;
    const branch = await this.branchService.getBranch(branchId);
    const currentPartnerData = await this.loadPartnerWithContacts(branch.partner_id).catch(() => ({ partner: null, contacts: [] }));

    this.sessions.patch(userKey, {
      selectedBranchId: branchId,
      flow: {
        type: 'edit_partner',
        step: 'enter_partner_query',
        branchId,
        currentPartnerId: branch.partner_id || null,
        foundPartners: [],
        partnerContactFieldIndex: 0,
        partnerContactPayload: {}
      }
    });

    return this.sender.reply(event, {
      text: [
        'Текущий филиал',
        '──────────',
        formatBranchCard(branch),
        '',
        branch.partner_id ? 'Текущий партнер филиала' : 'Текущий партнер филиала',
        '──────────',
        branch.partner_id && currentPartnerData.partner
          ? formatPartnerCard(currentPartnerData.partner)
          : (branch.partner_id ? `Не удалось загрузить партнера #${branch.partner_id}.` : 'У филиала сейчас не заполнен partner_id.'),
        '',
        'Контакты текущего партнера',
        '──────────',
        branch.partner_id ? formatPartnerContacts(currentPartnerData.contacts) : 'У текущего партнера пока нет данных, потому что сам партнер не привязан.',
        '',
        'Что делаем дальше',
        '──────────',
        'Введите ФИО / имя партнера, которого нужно привязать к филиалу.',
        'Можно писать, например:',
        '• ИП Малова Майя Михайловна',
        '• индивидуальный предприниматель Малова Майя',
        '• Малова Майя',
        'Поиск постарается это нормализовать.'
      ].filter(Boolean).join('\n'),
      buttons: FLOW_CONTROL_BUTTONS
    });
  }

  async handleEditPartnerFlow(event, userKey, text, flow) {
    if (flow.step === 'enter_partner_query') {
      return this.handleEditPartnerSearch(event, userKey, text, flow);
    }

    if (flow.step === 'select_partner') {
      return this.handleEditPartnerSelect(event, userKey, text, flow);
    }

    if (flow.step === 'enter_new_partner_fio') {
      return this.handleEnterNewPartnerFio(event, userKey, text, flow);
    }

    if (flow.step === 'enter_partner_contact_value') {
      return this.handlePartnerContactValue(event, userKey, text, flow);
    }

    return this.sender.reply(event, {
      text: 'Не получилось продолжить изменение партнера. Нажмите «шаг назад» или «меню».',
      buttons: FLOW_CONTROL_BUTTONS
    });
  }

  async handleEditPartnerSearch(event, userKey, text, flow) {
    const query = normalizeInput(text);
    if (!query) {
      return this.sender.reply(event, {
        text: 'Введите ФИО / имя партнера текстом. Например: Малова Майя Михайловна',
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    const partners = await this.branchService.searchPartners(query);
    if (!partners.length) {
      this.sessions.patch(userKey, {
        flow: {
          ...flow,
          step: 'enter_new_partner_fio',
          searchQuery: query,
          foundPartners: []
        }
      });

      return this.sender.reply(event, {
        text: [
          `По запросу «${query}» существующих партнеров не нашел.`,
          'Введите ФИО нового партнера, которого нужно создать в базе.',
          'Лучше ввести финальное ФИО без лишних префиксов.'
        ].join('\n'),
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    const candidates = await Promise.all(partners.slice(0, 9).map(async (partner) => {
      const contacts = await this.branchService.getPartnerContacts(partner.id).catch(() => []);
      return {
        partner,
        contacts: Array.isArray(contacts) ? contacts : []
      };
    }));

    this.sessions.patch(userKey, {
      flow: {
        ...flow,
        step: 'select_partner',
        searchQuery: query,
        foundPartners: candidates,
        newPartnerFio: undefined,
        partnerContactFieldIndex: 0,
        partnerContactPayload: {}
      }
    });

    const intro = candidates.length === 1
      ? 'Найден один похожий партнер. Использовать его или создать нового?'
      : `Найдено ${partners.length} похожих партнеров.${partners.length > candidates.length ? ` Показываю первые ${candidates.length}.` : ''} Выберите нужного кнопкой или создайте нового.`;

    return this.sender.reply(event, {
      text: [intro, '', this.formatPartnerCandidatesMessage(candidates)].join('\n'),
      buttons: buildPartnerSelectionButtons(candidates)
    });
  }

  async handleEditPartnerSelect(event, userKey, text, flow) {
    const normalized = normalizeInput(text);
    if (/^создать нового$/i.test(normalized)) {
      this.sessions.patch(userKey, {
        flow: {
          ...flow,
          step: 'enter_new_partner_fio',
          newPartnerFio: undefined,
          partnerContactFieldIndex: 0,
          partnerContactPayload: {}
        }
      });

      return this.sender.reply(event, {
        text: 'Введите ФИО нового партнера полностью. Например: Малова Майя Михайловна',
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    const candidates = Array.isArray(flow.foundPartners) ? flow.foundPartners : [];
    const byIndex = Number(normalized);
    let selected = null;

    if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= candidates.length) {
      selected = candidates[byIndex - 1];
    } else {
      selected = candidates.find((item) => String(item?.partner?.id) === normalized);
    }

    if (!selected?.partner?.id) {
      return this.sender.reply(event, {
        text: 'Не удалось распознать выбор. Нажмите кнопку с номером найденного партнера или «Создать нового».',
        buttons: buildPartnerSelectionButtons(candidates)
      });
    }

    const updatedBranch = await this.branchService.updateBranch(flow.branchId, {
      partner_id: selected.partner.id
    });

    this.sessions.patch(userKey, {
      selectedBranchId: flow.branchId,
      flow: null,
      awaitingCommandInput: null,
      awaitingBranchSelection: false
    });

    return this.sender.reply(event, {
      text: [
        'Готово, партнер филиала обновлен.',
        '',
        await this.buildCurrentBranchContextText(flow.branchId),
        '',
        'Теперь у филиала привязан партнер:',
        formatPartnerCard(selected.partner),
        '',
        'Контакты партнера:',
        formatPartnerContacts(selected.contacts),
        '',
        'Можно продолжать работу с этим филиалом кнопками ниже.'
      ].join('\n'),
      buttons: BRANCH_ACTION_BUTTONS
    });
  }

  async handleEnterNewPartnerFio(event, userKey, text, flow) {
    const fio = normalizeInput(text);
    if (!fio) {
      return this.sender.reply(event, {
        text: 'Введите ФИО нового партнера текстом целиком. Например: Малова Майя Михайловна',
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    this.sessions.patch(userKey, {
      flow: {
        ...flow,
        step: 'enter_partner_contact_value',
        newPartnerFio: fio,
        partnerContactFieldIndex: 0,
        partnerContactPayload: {}
      }
    });

    return this.sender.reply(event, {
      text: [
        `Новый партнер будет создан с ФИО: ${fio}`,
        '',
        buildPartnerContactPrompt(PARTNER_CONTACT_FIELD_ORDER[0], { isFirstStep: true })
      ].join('\n'),
      buttons: buildPartnerContactButtons()
    });
  }

  async handlePartnerContactValue(event, userKey, text, flow) {
    const fieldIndex = flow.partnerContactFieldIndex || 0;
    const field = PARTNER_CONTACT_FIELD_ORDER[fieldIndex];
    const payload = { ...(flow.partnerContactPayload || {}) };

    if (!isSkip(text) && !isNoValue(text)) {
      payload[field] = normalizeInput(text);
    }

    const nextIndex = fieldIndex + 1;
    if (nextIndex >= PARTNER_CONTACT_FIELD_ORDER.length) {
      const partner = await this.branchService.createPartner({ fio: flow.newPartnerFio });
      const contactPayload = { ...payload };
      const hasContactData = Object.values(contactPayload).some((value) => String(value || '').trim());

      let createdContact = null;
      if (hasContactData) {
        createdContact = await this.branchService.createPartnerContact(partner.id, contactPayload);
      }

      const updatedBranch = await this.branchService.updateBranch(flow.branchId, {
        partner_id: partner.id
      });

      this.sessions.patch(userKey, {
        selectedBranchId: flow.branchId,
        flow: null,
        awaitingCommandInput: null,
        awaitingBranchSelection: false
      });

      return this.sender.reply(event, {
        text: [
          'Готово, создан новый партнер и привязан к филиалу.',
          '',
          await this.buildCurrentBranchContextText(flow.branchId),
          '',
          'Новый партнер:',
          formatPartnerCard(partner),
          '',
          'Контакты партнера:',
          createdContact ? formatPartnerContacts([createdContact]) : 'Контакт партнера не создавался — все поля были пропущены.',
          '',
          'Можно продолжать работу с этим филиалом кнопками ниже.'
        ].join('\n'),
        buttons: BRANCH_ACTION_BUTTONS
      });
    }

    const nextField = PARTNER_CONTACT_FIELD_ORDER[nextIndex];
    this.sessions.patch(userKey, {
      flow: {
        ...flow,
        step: 'enter_partner_contact_value',
        partnerContactFieldIndex: nextIndex,
        partnerContactPayload: payload
      }
    });

    return this.sender.reply(event, {
      text: buildPartnerContactPrompt(nextField),
      buttons: buildPartnerContactButtons()
    });
  }

  async showHelp(event) {
    return this.sender.reply(event, {
      text: [
        'Привет! Я помогу найти филиал и работать с его данными, контактами и партнером.',
        '',
        'Главное меню:',
        '• найти филиал',
        '• создать филиал',
        '• проверки',
        '• изменить партнера',
        '• меню',
        '',
        'После выбора филиала будут доступны действия по нему: контакты, изменение контактов, изменение партнера и юр. лица.',
        '',
        'Как искать филиал:',
        '• по адресу ТТ — например: Москва_15 Люб',
        '• по юр. лицу / ФИО — например: Коваленко Ольга',
        '• по id филиала — например: 1211',
        '',
        'Полезно знать:',
        '• если найдется несколько филиалов, я покажу список и кнопки выбора',
        '• чтобы вернуться на шаг назад, напишите: шаг назад',
        '• чтобы вернуться в главное меню, напишите: меню'
      ].join('\n'),
      buttons: MAIN_MENU_BUTTONS
    });
  }

  async handleAwaitingCommandInput(event, userKey, text, awaiting) {
    this.sessions.patch(userKey, { awaitingCommandInput: null });

    if (awaiting.type === 'find_branch') {
      return this.handleFindBranch(event, userKey, `найти филиал ${text}`);
    }

    if (awaiting.type === 'contacts') {
      return this.handleContactsShortcut(event, userKey, `контакты ${text}`);
    }

    if (awaiting.type === 'create_branch') {
      return this.startCreateBranch(event, userKey, `создать филиал ${text}`);
    }

    if (awaiting.type === 'edit_partner') {
      return this.startEditPartner(event, userKey, `изменить партнера ${text}`);
    }

    if (awaiting.type === 'edit_contact') {
      return this.startEditContact(event, userKey, `изменить контакт ${text}`);
    }

    if (awaiting.type === 'add_contact') {
      return this.startAddContact(event, userKey, `добавить контакт ${text}`);
    }

    if (awaiting.type === 'delete_contact') {
      return this.startDeleteContact(event, userKey, `удалить контакт ${text}`);
    }

    if (awaiting.type === 'edit_jur_lico') {
      return this.startEditJurLico(event, userKey, `изменить юр лицо ${text}`);
    }

    return this.showHelp(event);
  }

  async handleFindBranch(event, userKey, text) {
    const query = text.replace(/^(найти филиал|филиал|поиск)\s*/i, '').trim();
    if (!query) {
      this.sessions.patch(userKey, {
        awaitingCommandInput: { type: 'find_branch' }
      });
      return this.sender.reply(event, {
        text: 'Введите адрес ТТ или юр. лицо. Например: Москва_15 Люб или Коваленко Ольга',
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    this.sessions.patch(userKey, { awaitingCommandInput: null });

    const branches = await this.branchService.findBranches(query);
    if (!branches.length) {
      this.sessions.clear(userKey);
      return this.sender.reply(event, { text: `По запросу «${query}» ничего не нашлось. Попробуйте адрес ТТ, id филиала или ФИО / юр. лицо.` });
    }

    if (branches.length >= 10 && countSearchTokens(query) < 2) {
      this.sessions.clear(userKey);
      return this.sender.reply(event, {
        text: [
          `Запрос «${query}» слишком общий, найдено слишком много совпадений.`,
          'Пожалуйста, уточните поиск.',
          '',
          'Можно указать:',
          '• фамилию + имя',
          '• адрес ТТ',
          '• id филиала'
        ].join('\n'),
        buttons: MAIN_MENU_BUTTONS
      });
    }

    if (branches.length === 1) {
      const branch = branches[0];
      this.sessions.patch(userKey, { selectedBranchId: branch.id, selectedBranchQuery: query });
      return this.sender.reply(event, {
        text: [
          'Нашел филиал:',
          await this.buildBranchDetailsText(branch, { includeActionsHint: true })
        ].join('\n'),
        buttons: BRANCH_ACTION_BUTTONS
      });
    }

    this.sessions.patch(userKey, {
      awaitingBranchSelection: true,
      foundBranches: branches.map((branch) => ({ id: branch.id })),
      selectedBranchQuery: query
    });

    return this.sender.reply(event, {
      text: [
        `Нашлось ${branches.length} филиалов по запросу: ${query}`,
        'Показываю найденные варианты ниже.',
        'Напишите номер из списка или id филиала:',
        '',
        formatBranchList(branches)
      ].join('\n'),
      buttons: [...buildNumberButtons(branches), ...FLOW_CONTROL_BUTTONS]
    });
  }

  async handleBranchSelection(event, userKey, text, session) {
    const branches = await Promise.all((session.foundBranches || []).map(async ({ id }) => this.branchService.getBranch(id)));
    const byIndex = Number(text);
    let selected = null;

    if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= branches.length) {
      selected = branches[byIndex - 1];
    } else {
      selected = branches.find((branch) => String(branch.id) === text.trim());
    }

    if (!selected) {
      return this.sender.reply(event, {
        text: 'Не удалось распознать выбор. Нажмите кнопку с номером или напишите id филиала.',
        buttons: [...buildNumberButtons(branches), ...FLOW_CONTROL_BUTTONS]
      });
    }

    this.sessions.patch(userKey, {
      awaitingBranchSelection: false,
      foundBranches: [],
      selectedBranchId: selected.id
    });

    return this.sender.reply(event, {
      text: [
        'Выбран филиал:',
        await this.buildBranchDetailsText(selected, { includeActionsHint: true })
      ].join('\n'),
      buttons: BRANCH_ACTION_BUTTONS
    });
  }

  async handleContactsShortcut(event, userKey, text) {
    const session = this.sessions.get(userKey);
    const query = text.replace(/^контакты\s*/i, '').trim();

    if (!query && !session.selectedBranchId) {
      this.sessions.patch(userKey, {
        awaitingCommandInput: { type: 'contacts' }
      });
      return this.sender.reply(event, {
        text: 'Напишите адрес ТТ, id филиала или юр. лицо, чтобы показать контакты. Например: Москва_15 Люб или Коваленко Ольга',
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    this.sessions.patch(userKey, { awaitingCommandInput: null });

    let branchId = session.selectedBranchId;
    if (query) {
      const branches = await this.branchService.findBranches(query);
      if (!branches.length) {
        return this.sender.reply(event, { text: `Не нашел филиал для показа контактов по запросу «${query}».` });
      }
      branchId = branches[0].id;
      this.sessions.patch(userKey, { selectedBranchId: branchId, selectedBranchQuery: query });
    }

    if (!branchId) {
      return this.sender.reply(event, {
        text: 'Сначала выберите филиал: нажмите «найти филиал» или напишите адрес ТТ, id филиала или ФИО / юр. лицо.'
      });
    }

    const branch = await this.branchService.getBranch(branchId);

    return this.sender.reply(event, {
      text: await this.buildBranchDetailsText(branch),
      buttons: BRANCH_ACTION_BUTTONS
    });
  }

  async resolveBranchForCommand(userKey, rawQuery) {
    const query = rawQuery.trim();
    const session = this.sessions.get(userKey);

    if (!query) {
      return session.selectedBranchId ? { branchId: session.selectedBranchId } : { error: 'Сначала выберите филиал: нажмите «найти филиал» или напишите адрес ТТ, id филиала или ФИО / юр. лицо.' };
    }

    this.sessions.patch(userKey, { awaitingCommandInput: null });

    const branches = await this.branchService.findBranches(query);
    if (!branches.length) {
      return { error: `Не нашел филиал по запросу «${query}». Попробуйте адрес ТТ, id филиала или ФИО / юр. лицо.` };
    }

    if (branches.length >= 10 && countSearchTokens(query) < 2) {
      return {
        error: [
          `Запрос «${query}» слишком общий, найдено слишком много совпадений.`,
          'Уточните фамилию + имя, адрес ТТ или id филиала.'
        ].join('\n')
      };
    }

    return { branchId: branches[0].id, query };
  }

  async startEditContact(event, userKey, text) {
    const query = text.replace(/^изменить контакт\s*/i, '');
    if (!query && !this.sessions.get(userKey).selectedBranchId) {
      this.sessions.patch(userKey, {
        awaitingCommandInput: { type: 'edit_contact' }
      });
      return this.sender.reply(event, {
        text: 'Напишите адрес ТТ, id филиала или юр. лицо, для которого нужно изменить контакт.',
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    const resolved = await this.resolveBranchForCommand(userKey, query);
    if (resolved.error) return this.sender.reply(event, { text: resolved.error });

    const branchId = resolved.branchId;
    const contacts = await this.branchService.getContacts(branchId);
    if (!Array.isArray(contacts) || !contacts.length) {
      return this.sender.reply(event, { text: 'У этого филиала пока нет контактов, которые можно изменить.' });
    }

    this.sessions.patch(userKey, {
      selectedBranchId: branchId,
      flow: {
        type: 'edit_contact',
        step: 'select_contact',
        branchId,
        contacts: contacts.map((contact) => ({
          id: contact.id,
          contact_type: contact.contact_type,
          fio: contact.fio,
          phone: contact.phone,
          telegram: contact.telegram,
          email: contact.email,
          yandex_messenger_login: contact.yandex_messenger_login,
          email_yandex: contact.email_yandex,
          birthday: contact.birthday,
          clothes_size: contact.clothes_size,
          tg_user_id: contact.tg_user_id,
          is_using_in_tg_bot: contact.is_using_in_tg_bot
        }))
      }
    });

    return this.sender.reply(event, {
      text: [
        'Выберите контакт, который хотите изменить.',
        'Можно нажать кнопку с номером или написать id контакта.',
        '',
        formatContacts(contacts)
      ].join('\n'),
      buttons: [...buildNumberButtons(contacts), ...FLOW_CONTROL_BUTTONS]
    });
  }

  async handleEditContactSelect(event, userKey, text, flow) {
    const existing = Array.isArray(flow.contacts) ? flow.contacts.filter(Boolean) : [];
    const normalizedText = sanitizeContactSelection(text);
    const byIndex = Number(normalizedText);
    let selected = null;

    if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= existing.length) {
      selected = existing[byIndex - 1];
    } else {
      selected = existing.find((contact) => String(contact.id) === normalizedText);
    }

    if (!selected) {
      return this.sender.reply(event, {
        text: 'Не удалось распознать контакт. Нажмите кнопку с номером или напишите id контакта.',
        buttons: [...buildNumberButtons(existing), ...FLOW_CONTROL_BUTTONS]
      });
    }

    this.sessions.patch(userKey, {
      flow: {
        ...flow,
        step: 'select_field',
        selectedContactId: selected.id,
        selectedContact: selected
      }
    });

    return this.sender.reply(event, {
      text: [
        `Выбран контакт #${selected.id}.`,
        'Какое поле хотите изменить?',
        formatContactFields(),
        '',
        'Можно написать номер поля, его код (например: phone) или нажать «изменить все поля».'
      ].join('\n'),
      buttons: [...buildFieldButtons(), ...FLOW_CONTROL_BUTTONS]
    });
  }

  async handleEditContactField(event, userKey, text, flow) {
    const normalizedText = normalizeInput(text).toLowerCase();
    const byIndex = Number(normalizedText);
    let field = null;

    if (/^изменить все поля$/i.test(normalizedText) || byIndex === CONTACT_FIELD_ORDER.length + 1) {
      const draftPayload = buildContactPayload(flow.selectedContact || {});
      this.sessions.patch(userKey, {
        flow: {
          ...flow,
          step: 'edit_all_value',
          selectedField: undefined,
          editAllIndex: 0,
          draftPayload
        }
      });

      return this.sender.reply(event, {
        text: buildEditContactFieldPrompt(flow.selectedContact, CONTACT_FIELD_ORDER[0], {
          index: 0,
          total: CONTACT_FIELD_ORDER.length
        }),
        buttons: buildEditValueButtons({ allowKeepCurrent: true, allowClear: true })
      });
    }

    if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= CONTACT_FIELD_ORDER.length) {
      field = CONTACT_FIELD_ORDER[byIndex - 1];
    } else {
      field = CONTACT_FIELD_ORDER.find((item) => item.toLowerCase() === normalizedText);
    }

    if (!field) {
      return this.sender.reply(event, {
        text: 'Не удалось распознать поле. Напишите номер поля, его код или нажмите «изменить все поля».',
        buttons: [...buildFieldButtons(), ...FLOW_CONTROL_BUTTONS]
      });
    }

    this.sessions.patch(userKey, {
      flow: {
        ...flow,
        step: 'enter_value',
        selectedField: field
      }
    });

    return this.sender.reply(event, {
      text: buildEditContactFieldPrompt(flow.selectedContact, field),
      buttons: buildEditValueButtons({ allowKeepCurrent: true, allowClear: true })
    });
  }

  async handleEditContactValue(event, userKey, text, flow) {
    const field = flow.selectedField;
    const currentContact = flow.selectedContact || await this.branchService.getContact(flow.selectedContactId);
    const payload = buildContactPayload(currentContact);

    if (isKeepCurrent(text)) {
      payload[field] = currentContact?.[field] ?? null;
    } else if (isClear(text)) {
      payload[field] = null;
    } else {
      payload[field] = normalizeInput(text);
    }

    const updated = await this.branchService.updateContact(flow.selectedContactId, payload);
    this.sessions.patch(userKey, {
      selectedBranchId: flow.branchId,
      flow: null,
      awaitingCommandInput: null,
      awaitingBranchSelection: false
    });

    return this.sender.reply(event, {
      text: [
        'Готово, контакт обновлен.',
        '',
        await this.buildCurrentBranchContextText(flow.branchId),
        '',
        formatContacts([updated]),
        '',
        'Можно продолжать работу с этим филиалом кнопками ниже.'
      ].join('\n'),
      buttons: BRANCH_ACTION_BUTTONS
    });
  }

  async handleEditContactAllValue(event, userKey, text, flow) {
    const currentContact = flow.selectedContact || await this.branchService.getContact(flow.selectedContactId);
    const index = flow.editAllIndex || 0;
    const field = CONTACT_FIELD_ORDER[index];
    const draftPayload = {
      ...buildContactPayload(currentContact),
      ...(flow.draftPayload || {})
    };

    if (isKeepCurrent(text)) {
      draftPayload[field] = currentContact?.[field] ?? null;
    } else if (isClear(text)) {
      draftPayload[field] = null;
    } else {
      draftPayload[field] = normalizeInput(text);
    }

    const nextIndex = index + 1;
    if (nextIndex >= CONTACT_FIELD_ORDER.length) {
      const updated = await this.branchService.updateContact(flow.selectedContactId, draftPayload);
      this.sessions.patch(userKey, {
        selectedBranchId: flow.branchId,
        flow: null,
        awaitingCommandInput: null,
        awaitingBranchSelection: false
      });

      return this.sender.reply(event, {
        text: [
          'Готово, контакт обновлен по всем полям.',
          '',
          await this.buildCurrentBranchContextText(flow.branchId),
          '',
          formatContacts([updated]),
          '',
          'Можно продолжать работу с этим филиалом кнопками ниже.'
        ].join('\n'),
        buttons: BRANCH_ACTION_BUTTONS
      });
    }

    this.sessions.patch(userKey, {
      flow: {
        ...flow,
        step: 'edit_all_value',
        editAllIndex: nextIndex,
        draftPayload
      }
    });

    const draftContact = {
      ...(currentContact || {}),
      ...draftPayload
    };

    return this.sender.reply(event, {
      text: buildEditContactFieldPrompt(draftContact, CONTACT_FIELD_ORDER[nextIndex], {
        index: nextIndex,
        total: CONTACT_FIELD_ORDER.length
      }),
      buttons: buildEditValueButtons({ allowKeepCurrent: true, allowClear: true })
    });
  }

  async startAddContact(event, userKey, text) {
    const query = text.replace(/^добавить контакт\s*/i, '');
    if (!query && !this.sessions.get(userKey).selectedBranchId) {
      this.sessions.patch(userKey, {
        awaitingCommandInput: { type: 'add_contact' }
      });
      return this.sender.reply(event, {
        text: 'Напишите адрес ТТ, id филиала или юр. лицо, для которого нужно добавить контакт.',
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    const resolved = await this.resolveBranchForCommand(userKey, query);
    if (resolved.error) return this.sender.reply(event, { text: resolved.error });

    const branchId = resolved.branchId;
    this.sessions.patch(userKey, {
      selectedBranchId: branchId,
      flow: {
        type: 'add_contact',
        step: 'enter_value',
        branchId,
        fieldIndex: 0,
        payload: {}
      }
    });

    return this.sender.reply(event, {
      text: [
        'Начинаем добавление нового контакта.',
        buildCreateContactPrompt(CREATE_CONTACT_FIELD_ORDER[0], { isFirstStep: true })
      ].join('\n'),
      buttons: buildCreateContactButtons(CREATE_CONTACT_FIELD_ORDER[0])
    });
  }

  async handleAddContactFlow(event, userKey, text, flow) {
    const field = CREATE_CONTACT_FIELD_ORDER[flow.fieldIndex];
    const payload = { ...(flow.payload || {}) };

    if (!isSkip(text)) {
      payload[field] = normalizeInput(text);
    }

    const nextIndex = flow.fieldIndex + 1;
    if (nextIndex >= CREATE_CONTACT_FIELD_ORDER.length) {
      const created = await this.branchService.createContact(flow.branchId, payload);
      this.sessions.patch(userKey, {
        selectedBranchId: flow.branchId,
        flow: null,
        awaitingCommandInput: null,
        awaitingBranchSelection: false
      });
      return this.sender.reply(event, {
        text: [
          'Готово, контакт создан.',
          '',
          await this.buildCurrentBranchContextText(flow.branchId),
          '',
          formatContacts([created]),
          '',
          'Можно продолжать работу с этим филиалом кнопками ниже.'
        ].join('\n'),
        buttons: BRANCH_ACTION_BUTTONS
      });
    }

    const nextField = CREATE_CONTACT_FIELD_ORDER[nextIndex];
    this.sessions.patch(userKey, {
      flow: {
        ...flow,
        fieldIndex: nextIndex,
        payload
      }
    });

    return this.sender.reply(event, {
      text: buildCreateContactPrompt(nextField),
      buttons: buildCreateContactButtons(nextField)
    });
  }

  async startDeleteContact(event, userKey, text) {
    const query = text.replace(/^удалить контакт\s*/i, '');
    if (!query && !this.sessions.get(userKey).selectedBranchId) {
      this.sessions.patch(userKey, {
        awaitingCommandInput: { type: 'delete_contact' }
      });
      return this.sender.reply(event, {
        text: 'Напишите адрес ТТ, id филиала или юр. лицо, для которого нужно удалить контакт.',
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    const resolved = await this.resolveBranchForCommand(userKey, query);
    if (resolved.error) return this.sender.reply(event, { text: resolved.error });

    const branchId = resolved.branchId;
    const contacts = await this.branchService.getContacts(branchId);
    if (!Array.isArray(contacts) || !contacts.length) {
      return this.sender.reply(event, { text: 'У этого филиала нет контактов, которые можно удалить.' });
    }

    this.sessions.patch(userKey, {
      selectedBranchId: branchId,
      flow: {
        type: 'delete_contact',
        step: 'select_contact',
        branchId,
        contacts: contacts.map((contact) => ({
          id: contact.id,
          contact_type: contact.contact_type,
          fio: contact.fio,
          phone: contact.phone,
          telegram: contact.telegram,
          email: contact.email,
          yandex_messenger_login: contact.yandex_messenger_login,
          email_yandex: contact.email_yandex,
          birthday: contact.birthday,
          clothes_size: contact.clothes_size,
          tg_user_id: contact.tg_user_id,
          is_using_in_tg_bot: contact.is_using_in_tg_bot
        }))
      }
    });

    return this.sender.reply(event, {
      text: [
        'Выберите контакт, который хотите удалить.',
        'Можно нажать кнопку с номером или написать id контакта.',
        '',
        formatContacts(contacts)
      ].join('\n'),
      buttons: [...buildNumberButtons(contacts), ...FLOW_CONTROL_BUTTONS]
    });
  }

  async handleDeleteContactSelect(event, userKey, text, flow) {
    const existing = Array.isArray(flow.contacts) ? flow.contacts.filter(Boolean) : [];
    const normalizedText = sanitizeContactSelection(text);
    const byIndex = Number(normalizedText);
    let selected = null;

    if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= existing.length) {
      selected = existing[byIndex - 1];
    } else {
      selected = existing.find((contact) => String(contact.id) === normalizedText);
    }

    if (!selected) {
      return this.sender.reply(event, {
        text: 'Не удалось распознать контакт. Нажмите кнопку с номером или напишите id контакта.',
        buttons: [...buildNumberButtons(existing), ...FLOW_CONTROL_BUTTONS]
      });
    }

    this.sessions.patch(userKey, {
      flow: {
        ...flow,
        step: 'confirm',
        selectedContactId: selected.id,
        selectedContact: selected
      }
    });

    return this.sender.reply(event, {
      text: [
        'Подтвердите удаление контакта:',
        formatContacts([selected]),
        '',
        'Напишите «да» или «нет».'
      ].join('\n'),
      buttons: CONFIRM_BUTTONS
    });
  }

  async handleDeleteContactConfirm(event, userKey, text, flow) {
    if (/^(нет|no|n)$/i.test(normalizeInput(text))) {
      this.sessions.patch(userKey, {
        selectedBranchId: flow.branchId,
        flow: null,
        awaitingCommandInput: null,
        awaitingBranchSelection: false
      });
      return this.sender.reply(event, {
        text: [
          'Удаление отменено.',
          '',
          await this.buildCurrentBranchContextText(flow.branchId),
          '',
          'Можно продолжать работу с этим филиалом кнопками ниже.'
        ].join('\n'),
        buttons: BRANCH_ACTION_BUTTONS
      });
    }

    if (!/^(да|yes|y)$/i.test(normalizeInput(text))) {
      return this.sender.reply(event, { text: 'Пожалуйста, ответьте: «да» или «нет».', buttons: CONFIRM_BUTTONS });
    }

    await this.branchService.deleteContact(flow.selectedContactId);
    this.sessions.patch(userKey, {
      selectedBranchId: flow.branchId,
      flow: null,
      awaitingCommandInput: null,
      awaitingBranchSelection: false
    });
    return this.sender.reply(event, {
      text: [
        `Готово, контакт #${flow.selectedContactId} удален.`,
        '',
        await this.buildCurrentBranchContextText(flow.branchId),
        '',
        'Можно продолжать работу с этим филиалом кнопками ниже.'
      ].join('\n'),
      buttons: BRANCH_ACTION_BUTTONS
    });
  }

  async startEditJurLico(event, userKey, text) {
    const query = text.replace(/^(изменить\s*юр\.?\s*лицо|изменить\s*юр\s*лицо)\s*/i, '');
    if (!query && !this.sessions.get(userKey).selectedBranchId) {
      this.sessions.patch(userKey, {
        awaitingCommandInput: { type: 'edit_jur_lico' }
      });
      return this.sender.reply(event, {
        text: 'Напишите адрес ТТ, id филиала или юр. лицо, у которого нужно изменить юр лицо.',
        buttons: FLOW_CONTROL_BUTTONS
      });
    }

    const resolved = await this.resolveBranchForCommand(userKey, query);
    if (resolved.error) return this.sender.reply(event, { text: resolved.error });

    const branchId = resolved.branchId;
    const branch = await this.branchService.getBranch(branchId);
    this.sessions.patch(userKey, {
      selectedBranchId: branchId,
      flow: {
        type: 'edit_jur_lico',
        step: 'enter_value',
        branchId
      }
    });

    return this.sender.reply(event, {
      text: [
        'Текущее юр. лицо филиала:',
        branch.jur_lico || 'не заполнено',
        '',
        'Напишите новое юр лицо, нажмите «Оставить текущее» или «Сделать пустым».'
      ].join('\n'),
      buttons: buildEditValueButtons({ allowKeepCurrent: true, allowClear: true })
    });
  }

  async handleEditJurLicoValue(event, userKey, text, flow) {
    const rawValue = normalizeInput(text);
    let value = rawValue;

    if (isKeepCurrent(text)) {
      value = (await this.branchService.getBranch(flow.branchId)).jur_lico ?? null;
    } else if (isClear(text)) {
      value = null;
    } else if (!rawValue) {
      return this.sender.reply(event, {
        text: 'Напишите новое юр лицо текстом целиком или воспользуйтесь кнопками ниже.',
        buttons: buildEditValueButtons({ allowKeepCurrent: true, allowClear: true })
      });
    }

    const updatedBranch = await this.branchService.updateBranch(flow.branchId, {
      jur_lico: value
    });

    this.sessions.patch(userKey, {
      selectedBranchId: flow.branchId,
      flow: null,
      awaitingCommandInput: null,
      awaitingBranchSelection: false
    });

    return this.sender.reply(event, {
      text: [
        'Готово, юр. лицо филиала обновлено.',
        '',
        await this.buildCurrentBranchContextText(flow.branchId),
        '',
        'Можно продолжать работу с этим филиалом кнопками ниже.'
      ].join('\n'),
      buttons: BRANCH_ACTION_BUTTONS
    });
  }
}

module.exports = { BotService };
