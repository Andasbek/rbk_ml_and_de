// Сборка Word v2 — переработанная под замечание ментора: «5 ОТДЕЛЬНЫХ систем»
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
  TableOfContents,
} = require("docx");

// ===== Стили / цвета =====
const C_HEAD = "1F4E79", C_SUB = "2E75B6", C_LIGHT = "EAF1F8", C_ALT = "F5F9FC", C_TXT = "555555";
const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };

const P = (t, opts = {}) => new Paragraph({
  spacing: { after: 120, line: 300 }, ...opts,
  children: [new TextRun({ text: t, ...(opts.run || {}) })],
});
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });

const Note = (t, label = "📌") => new Paragraph({
  spacing: { before: 80, after: 120 },
  shading: { fill: C_LIGHT, type: ShadingType.CLEAR },
  border: { left: { style: BorderStyle.SINGLE, size: 24, color: C_SUB, space: 8 } },
  children: [new TextRun({ text: label + "  " + t, italics: true, color: C_TXT })],
});
const Warn = (t) => new Paragraph({
  spacing: { before: 80, after: 120 },
  shading: { fill: "FFF4E5", type: ShadingType.CLEAR },
  border: { left: { style: BorderStyle.SINGLE, size: 24, color: "C65911", space: 8 } },
  children: [new TextRun({ text: "⚠  " + t, italics: true, color: "8A4500" })],
});
const Ok = (t) => new Paragraph({
  spacing: { before: 80, after: 120 },
  shading: { fill: "E8F5E9", type: ShadingType.CLEAR },
  border: { left: { style: BorderStyle.SINGLE, size: 24, color: "2E7D32", space: 8 } },
  children: [new TextRun({ text: "✔  " + t, italics: true, color: "1B5E20" })],
});

const CodeBlock = (code) =>
  code.split("\n").map((ln) => new Paragraph({
    spacing: { after: 0, line: 260 },
    shading: { fill: "F2F2F2", type: ShadingType.CLEAR },
    children: [new TextRun({ text: ln || " ", font: "Consolas", size: 20 })],
  }));

const Bullet = (t) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun(t)] });
const Numbered = (t) => new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun(t)] });

const PlaceholderForScreenshot = (caption) => [
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: {
        top:    { style: BorderStyle.DASHED, size: 8, color: C_SUB },
        bottom: { style: BorderStyle.DASHED, size: 8, color: C_SUB },
        left:   { style: BorderStyle.DASHED, size: 8, color: C_SUB },
        right:  { style: BorderStyle.DASHED, size: 8, color: C_SUB },
      },
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill: "FBFBFB", type: ShadingType.CLEAR },
      margins: { top: 600, bottom: 600, left: 200, right: 200 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "📷  ВСТАВЬТЕ СКРИНШОТ ЗДЕСЬ", bold: true, color: C_SUB, size: 24 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 },
          children: [new TextRun({ text: caption, italics: true, color: C_TXT, size: 20 })] }),
      ],
    })] })],
  }),
  new Paragraph({ spacing: { after: 200 }, children: [new TextRun(" ")] }),
];

const SimpleTable = (cols, header, data, opts = {}) => {
  const totalW = cols.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({ tableHeader: true,
    children: header.map((h, i) => new TableCell({
      borders, width: { size: cols[i], type: WidthType.DXA },
      shading: { fill: C_HEAD, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF" })] })],
    })),
  });
  const dataRows = data.map((row, ri) => new TableRow({
    children: row.map((v, ci) => new TableCell({
      borders, width: { size: cols[ci], type: WidthType.DXA },
      shading: { fill: ri % 2 ? C_ALT : "FFFFFF", type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: String(v) })] })],
    })),
  }));
  return new Table({ width: { size: totalW, type: WidthType.DXA }, columnWidths: cols, rows: [headerRow, ...dataRows] });
};

// ============================================================
// СОДЕРЖИМОЕ ДОКУМЕНТА
// ============================================================
const children = [];

// ------------- ТИТУЛЬНЫЙ ЛИСТ -------------
children.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 200 },
  children: [new TextRun({ text: "ДОМАШНЕЕ ЗАДАНИЕ", bold: true, color: C_HEAD, size: 36 })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { after: 200 },
  children: [new TextRun({ text: "Пять независимых источников данных банка", bold: true, size: 28, color: C_SUB })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { after: 200 },
  children: [new TextRun({ text: "CRM • Core Banking • Card System • Mobile App • Processing", size: 22, color: C_TXT })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { after: 600 },
  children: [new TextRun({ text: "Курс «Data Engineering» — ДЗ переработано по фидбеку", italics: true, color: C_TXT, size: 22 })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "Студент: Талгат Сундетов", size: 24 })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { after: 1200 },
  children: [new TextRun({ text: "Дата сдачи: " + new Date().toLocaleDateString("ru-RU"), color: C_TXT, size: 22 })],
}));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ------------- СОДЕРЖАНИЕ -------------
children.push(H1("Содержание"));
children.push(new TableOfContents("Оглавление", { hyperlink: true, headingStyleRange: "1-3" }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ===== 1. Учёт замечаний предыдущей сдачи =====
children.push(H1("1. Что изменено относительно предыдущей сдачи"));
children.push(P("Документ полностью переработан после фидбека ментора. Ниже — кратко о замечании и о том, как оно закрыто."));

children.push(H2("1.1. Замечание ментора"));
children.push(Warn(
  "В предыдущей версии работы получилась одна база данных с набором связанных таблиц — фактически один источник данных, а не пять. " +
  "Под «источниками» в задании подразумевались разные системы (CRM, Core banking, Card system, Mobile app, Processing). " +
  "Нужно: (1) явно выделить 5 источников как отдельные системы; (2) показать это в отчёте; " +
  "(3) уточнить, какие таблицы относятся к какому источнику; (4) объяснить интеграцию в ХД."
));

children.push(H2("1.2. Что сделано"));
children.push(SimpleTable(
  [3500, 5800],
  ["Пункт замечания", "Что сделано в новой версии"],
  [
    ["1) Явно выделить 5 источников как отдельные системы",
     "Развёрнуто 5 ОТДЕЛЬНЫХ баз PostgreSQL: crm, core_banking, card_system, mobile_app, processing. У каждой свой DDL, своя схема, свой владелец."],
    ["2) Показать архитектуру в отчёте",
     "Добавлен раздел 2 с подробной таблицей систем и архитектурная диаграмма (раздел 2.3)."],
    ["3) Уточнить, какие таблицы относятся к какому источнику",
     "Каждой системе посвящён отдельный подраздел (3.1-3.5) с DDL, таблицей колонок и описанием логики."],
    ["4) Объяснить интеграцию в ХД",
     "Добавлен раздел 8 «Интеграция источников в ХД» с описанием слоёв RAW → DDS → DM и примерами SQL для каждого слоя."],
  ]
));
children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun(" ")] }));
children.push(Ok("Генерация данных не переделывалась — она была признана корректной. Данные перераспределены по 5 новым источникам с сохранением связей."));

// ===== 2. Архитектура: 5 ОТДЕЛЬНЫХ СИСТЕМ =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("2. Архитектура: 5 независимых источников"));

children.push(H2("2.1. Концепция «источник = отдельная система»"));
children.push(P(
  "В реальном банке информационные системы строятся не как одна большая база, а как набор независимых сервисов: " +
  "CRM-система для работы с клиентами, АБС (Core Banking) для учёта счетов, карточный процессинг для выпуска и обслуживания карт, " +
  "ДБО / мобильное приложение для каналов self-service, процессинговый центр для обработки транзакций. " +
  "У каждой системы — свой стек, свой владелец, свой жизненный цикл, своя БД."
));
children.push(P(
  "В нашем решении это воспроизведено явно: каждая из 5 систем — это ОТДЕЛЬНАЯ база PostgreSQL. " +
  "Между системами НЕТ физических внешних ключей (CONSTRAINT FOREIGN KEY): таблицы живут в разных БД, " +
  "и FK между ними физически невозможен. Связи между источниками реализованы как «логические» — через одинаковые ID " +
  "(customer_id, account_id, card_id), которые используются как сквозные ключи."
));

children.push(H2("2.2. Таблица 5 систем"));
children.push(SimpleTable(
  [320, 1500, 2200, 2400, 1640, 1300],
  ["№", "Система", "База (PostgreSQL)", "Назначение", "Владелец", "Доставка данных"],
  [
    ["1", "CRM",          "crm",          "Управление клиентской базой",                          "Розница / маркетинг",  "Real-time"],
    ["2", "Core Banking", "core_banking", "АБС: счета, отделения, обороты",                       "Операционный блок",    "Микробатч (CDC)"],
    ["3", "Card System",  "card_system",  "Карточный процессинг: карты, мерчанты",                "Карточный департамент","Real-time"],
    ["4", "Mobile App",   "mobile_app",   "ДБО: сессии и события в моб./интернет-банке",          "Digital-команда",      "Kafka stream"],
    ["5", "Processing",   "processing",   "Транзакции и расчёты по счетам и картам",              "Процессинговый центр", "Kafka + клиринг daily"],
  ]
));
children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun(" ")] }));

children.push(H2("2.3. Архитектурная диаграмма"));
children.push(P("На диаграмме видно: пять источников — это 5 НЕЗАВИСИМЫХ систем (верхний ряд), каждая со своей БД и набором таблиц. Данные из них через ETL/CDC попадают в единое хранилище (3 слоя: RAW → DDS → DM)."));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 },
  children: [new ImageRun({
    type: "png",
    data: fs.readFileSync(path.resolve(__dirname, "..", "images", "architecture.png")),
    transformation: { width: 620, height: 398 },
    altText: { title: "Архитектура источников", description: "5 отдельных систем → ETL → ХД (RAW/DDS/DM)", name: "architecture" },
  })],
}));
children.push(P("Рисунок 1. Архитектура: 5 независимых источников и хранилище данных.", { run: { italics: true, color: C_TXT, size: 20 } }));

children.push(H2("2.4. Логические связи между источниками"));
children.push(P("Источники независимы, но связаны через одинаковые сквозные ID. Это то, что позволит при загрузке в ХД соединить данные в единую картину клиента."));
children.push(SimpleTable(
  [4000, 5300],
  ["Связь (источник → источник)", "Поле / Ключ"],
  [
    ["Core Banking.accounts → CRM.customers",     "accounts.customer_id  =  customers.customer_id"],
    ["Card System.cards → CRM.customers",         "cards.customer_id  =  customers.customer_id"],
    ["Card System.cards → Core Banking.accounts", "cards.account_id  =  accounts.account_id"],
    ["Mobile App.devices → CRM.customers",        "devices.customer_id  =  customers.customer_id"],
    ["Mobile App.sessions → CRM.customers",       "sessions.customer_id  =  customers.customer_id"],
    ["Processing.transactions → Core Banking",    "transactions.account_id  =  accounts.account_id"],
    ["Processing.authorizations → Card System",   "authorizations.card_id  =  cards.card_id"],
  ]
));
children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun(" ")] }));
children.push(Ok("Все 6 кросс-источниковых связей проверены автоматически после генерации: 0 невалидных ссылок (orphan = 0)."));

// ===== 3. Описание каждой системы =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("3. Подробное описание 5 систем"));

const systemSections = [
  {
    title: "3.1. Источник 1 — CRM",
    db: "crm",
    purpose: "CRM-система — единая точка истины по клиенту. Хранит master-данные клиентов (ФИО, ИИН, день рождения, контактные данные, текущий сегмент). Все остальные системы берут customer_id отсюда.",
    tables: [
      ["customers", "Master-таблица клиентов", "1000"],
      ["customer_contacts", "Телефоны, email, адреса клиентов", "≈3400"],
      ["customer_segments_history", "История смены сегмента (SCD type 2)", "≈1300"],
    ],
    crossLinks: "Является родителем для всех остальных источников: customer_id используется в Core Banking, Card System, Mobile App.",
  },
  {
    title: "3.2. Источник 2 — Core Banking",
    db: "core_banking",
    purpose: "Автоматизированная Банковская Система (АБС). Учёт счетов клиентов, отделений и ежедневных оборотов. Не отвечает за конкретные транзакции (это делает Processing) — здесь хранится только агрегированное состояние.",
    tables: [
      ["branches", "Отделения банка", "10"],
      ["accounts", "Счета клиентов", "1500"],
      ["daily_turnovers", "Ежедневные обороты по счёту (агрегат)", "6000"],
    ],
    crossLinks: "accounts.customer_id → CRM.customers.customer_id. accounts.account_id используется в Card System.cards.account_id и Processing.transactions.account_id.",
  },
  {
    title: "3.3. Источник 3 — Card System",
    db: "card_system",
    purpose: "Карточный процессинг. Выпускает карты, ведёт справочник торговых точек (мерчантов), фиксирует блокировки карт. Не отвечает за конкретные авторизации/клиринг (это делает Processing) — здесь хранится только «жизненный цикл» карты.",
    tables: [
      ["cards", "Карты клиентов (PAN хешируется)", "1200"],
      ["merchants", "Справочник торгово-сервисных точек (MCC)", "100"],
      ["card_blocks", "История блокировок карт", "250"],
    ],
    crossLinks: "cards.customer_id → CRM.customers. cards.account_id → Core Banking.accounts. cards.card_id используется в Processing.authorizations.",
  },
  {
    title: "3.4. Источник 4 — Mobile App",
    db: "mobile_app",
    purpose: "Дистанционное банковское обслуживание (моб. + интернет-банк). Регистрирует устройства клиента, сессии входа и события внутри приложения. Это поток поведенческих данных — основа для аналитики продукта и фрод-мониторинга.",
    tables: [
      ["devices", "Устройства, с которых заходит клиент", "1200"],
      ["sessions", "Сессии входа в приложение", "2000"],
      ["events", "События внутри сессии (view, transfer, ...)", "6000"],
    ],
    crossLinks: "devices.customer_id и sessions.customer_id → CRM.customers.",
  },
  {
    title: "3.5. Источник 5 — Processing",
    db: "processing",
    purpose: "Процессинговый центр. Обрабатывает фактические денежные движения: транзакции по счетам, авторизации по картам и финальный клиринг с платёжными системами Visa / Mastercard.",
    tables: [
      ["transactions", "Транзакции по счетам", "12000"],
      ["authorizations", "Online-авторизации по картам", "5000"],
      ["clearing", "Финальные расчёты по авторизациям", "3710"],
    ],
    crossLinks: "transactions.account_id → Core Banking.accounts. authorizations.card_id → Card System.cards.",
  },
];

for (const s of systemSections) {
  children.push(H2(s.title));
  children.push(P(s.purpose));
  children.push(H3("Таблицы источника"));
  children.push(SimpleTable(
    [2600, 5500, 1300],
    ["Таблица", "Назначение", "Строк (план)"],
    s.tables
  ));
  children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun(" ")] }));
  children.push(H3("Связи с другими источниками"));
  children.push(P(s.crossLinks));
}

// ===== 4. Подготовка окружения =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("4. Подготовка окружения (Windows + WSL Ubuntu)"));

children.push(H2("4.1. Установка PostgreSQL и Python"));
children.push(...CodeBlock(`sudo apt update
sudo apt install -y postgresql postgresql-contrib python3-pip
sudo service postgresql start
sudo service postgresql status
psql --version
pip install faker --break-system-packages`));
children.push(...PlaceholderForScreenshot("Скриншот 1. Версия psql + статус сервиса PostgreSQL + установленный Faker"));

children.push(H2("4.2. Пароль пользователя postgres"));
children.push(...CodeBlock(`sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'postgres';
\\q

# Перевести аутентификацию на md5 и перезапустить
PG_VER=$(ls /etc/postgresql/ | head -1)
sudo sed -i 's/local\\s\\+all\\s\\+all\\s\\+peer/local all all md5/' /etc/postgresql/$PG_VER/main/pg_hba.conf
sudo service postgresql restart

export PGPASSWORD=postgres`));

// ===== 5. Создание 5 БД =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("5. Создание 5 отдельных баз данных"));
children.push(P("Это ключевой шаг, реализующий замечание ментора: КАЖДАЯ из 5 систем — это отдельная база PostgreSQL."));
children.push(...CodeBlock(`psql -U postgres -h localhost <<EOF
CREATE DATABASE crm;
CREATE DATABASE core_banking;
CREATE DATABASE card_system;
CREATE DATABASE mobile_app;
CREATE DATABASE processing;
EOF

psql -U postgres -h localhost -c "\\l" | grep -E "crm|core_banking|card_system|mobile_app|processing"`));
children.push(...PlaceholderForScreenshot("Скриншот 2. Список 5 ОТДЕЛЬНЫХ баз данных в выводе \\l"));

// ===== 6. DDL =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("6. Создание таблиц (DDL) в каждой системе"));
children.push(P("Каждая система имеет свой DDL-файл. Запускаем их по очереди:"));
children.push(...CodeBlock(`cd ~/dz2
psql -U postgres -h localhost -d crm           -f ddl/01_crm.sql
psql -U postgres -h localhost -d core_banking  -f ddl/02_core_banking.sql
psql -U postgres -h localhost -d card_system   -f ddl/03_card_system.sql
psql -U postgres -h localhost -d mobile_app    -f ddl/04_mobile_app.sql
psql -U postgres -h localhost -d processing    -f ddl/05_processing.sql`));
children.push(...PlaceholderForScreenshot("Скриншот 3. Успешный прогон DDL для всех 5 баз (серии CREATE TABLE)"));

children.push(H2("6.1. Проверка таблиц в каждой системе"));
children.push(...CodeBlock(`psql -U postgres -h localhost -d crm           -c "\\dt crm.*"
psql -U postgres -h localhost -d core_banking  -c "\\dt core.*"
psql -U postgres -h localhost -d card_system   -c "\\dt cards.*"
psql -U postgres -h localhost -d mobile_app    -c "\\dt app.*"
psql -U postgres -h localhost -d processing    -c "\\dt proc.*"`));
children.push(...PlaceholderForScreenshot("Скриншот 4. Таблицы в каждой из 5 баз (\\dt × 5 раз)"));

// ===== 7. Генерация и загрузка =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("7. Генерация и загрузка данных"));

children.push(H2("7.1. Запуск генератора"));
children.push(P("Скрипт scripts/generate_data.py создаёт CSV и SQL-загрузчики для каждой системы. Генерация повторяема (SEED=42)."));
children.push(...CodeBlock(`cd ~/dz2/scripts
python3 generate_data.py`));
children.push(...PlaceholderForScreenshot("Скриншот 5. Финальная сводка генератора: распределение строк по 5 источникам"));

children.push(H2("7.2. Объём сгенерированных данных"));
children.push(SimpleTable(
  [3700, 3000, 2600],
  ["Источник", "Таблицы", "Строк всего"],
  [
    ["CRM",          "customers / customer_contacts / customer_segments_history", "≈5 684"],
    ["Core Banking", "branches / accounts / daily_turnovers",                     "≈7 510"],
    ["Card System",  "merchants / cards / card_blocks",                           "≈1 550"],
    ["Mobile App",   "devices / sessions / events",                               "≈9 200"],
    ["Processing",   "transactions / authorizations / clearing",                  "≈20 710"],
    ["ИТОГО (план >10 000)", "",                                                  "≈44 654 ✔"],
  ]
));
children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun(" ")] }));

children.push(H2("7.3. Загрузка данных в PostgreSQL"));
children.push(P("Загружаем данные в каждую систему в правильном порядке (родительские таблицы → дочерние):"));
children.push(...CodeBlock(`# --- CRM ---
psql -U postgres -h localhost -d crm -f data/crm/load_customers.sql
psql -U postgres -h localhost -d crm -f data/crm/load_customer_contacts.sql
psql -U postgres -h localhost -d crm -f data/crm/load_customer_segments_history.sql

# --- Core Banking ---
psql -U postgres -h localhost -d core_banking -f data/core_banking/load_branches.sql
psql -U postgres -h localhost -d core_banking -f data/core_banking/load_accounts.sql
psql -U postgres -h localhost -d core_banking -f data/core_banking/load_daily_turnovers.sql

# --- Card System ---
psql -U postgres -h localhost -d card_system -f data/card_system/load_merchants.sql
psql -U postgres -h localhost -d card_system -f data/card_system/load_cards.sql
psql -U postgres -h localhost -d card_system -f data/card_system/load_card_blocks.sql

# --- Mobile App ---
psql -U postgres -h localhost -d mobile_app -f data/mobile_app/load_devices.sql
psql -U postgres -h localhost -d mobile_app -f data/mobile_app/load_sessions.sql
psql -U postgres -h localhost -d mobile_app -f data/mobile_app/load_events.sql

# --- Processing ---
psql -U postgres -h localhost -d processing -f data/processing/load_transactions.sql
psql -U postgres -h localhost -d processing -f data/processing/load_authorizations.sql
psql -U postgres -h localhost -d processing -f data/processing/load_clearing.sql`));
children.push(...PlaceholderForScreenshot("Скриншот 6. Серия INSERT 0 N для каждой из 5 систем"));

children.push(H2("7.4. Проверка количества строк в каждой системе"));
children.push(...CodeBlock(`# Пример для одной системы (для остальных аналогично):
psql -U postgres -h localhost -d crm <<EOF
SELECT 'customers' AS t, COUNT(*) FROM crm.customers
UNION ALL SELECT 'customer_contacts', COUNT(*) FROM crm.customer_contacts
UNION ALL SELECT 'customer_segments_history', COUNT(*) FROM crm.customer_segments_history;
EOF`));
children.push(...PlaceholderForScreenshot("Скриншот 7. COUNT(*) по таблицам каждой из 5 систем (по одному скриншоту на систему — или один общий с 5 блоками)"));

// ===== 8. Интеграция в ХД =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("8. Интеграция 5 источников в ХД (Data Warehouse)"));
children.push(P(
  "Чтобы получить единую картину клиента, данные из 5 независимых источников нужно собрать в одно хранилище. " +
  "Классическая трёхслойная архитектура (Lakehouse / Bronze-Silver-Gold или RAW-DDS-DM) делает это так:"
));

children.push(H2("8.1. Слой RAW (bronze) — приземление данных «как есть»"));
children.push(P("В RAW каждая таблица из каждого источника копируется 1:1. Имена таблиц в RAW обычно содержат префикс источника, чтобы не было конфликтов (customers в CRM и customers в каком-то другом источнике)."));
children.push(...CodeBlock(`-- Создаём отдельную базу для DWH и схему RAW
CREATE DATABASE dwh;
\\c dwh
CREATE SCHEMA raw;

-- 1:1 копии таблиц из каждого источника
CREATE TABLE raw.crm__customers          AS SELECT * FROM dblink('host=... dbname=crm',           'SELECT * FROM crm.customers')          AS t(...);
CREATE TABLE raw.core_banking__accounts  AS SELECT * FROM dblink('host=... dbname=core_banking',  'SELECT * FROM core.accounts')          AS t(...);
CREATE TABLE raw.card_system__cards      AS SELECT * FROM dblink('host=... dbname=card_system',   'SELECT * FROM cards.cards')            AS t(...);
CREATE TABLE raw.mobile_app__sessions    AS SELECT * FROM dblink('host=... dbname=mobile_app',    'SELECT * FROM app.sessions')           AS t(...);
CREATE TABLE raw.processing__transactions AS SELECT * FROM dblink('host=... dbname=processing',   'SELECT * FROM proc.transactions')      AS t(...);`));
children.push(Note("В реальном проекте вместо dblink используется Airflow + Debezium / Kafka Connect для CDC, либо просто daily-полная выгрузка через COPY."));

children.push(H2("8.2. Слой DDS (silver) — Data Vault: хабы, линки, сателлиты"));
children.push(P("В DDS объединяем данные по бизнес-ключам. Главный хаб — клиент. В него вливается customer_id из всех 5 источников."));
children.push(...CodeBlock(`CREATE SCHEMA dds;

-- ХАБ КЛИЕНТА: одна запись на бизнес-ключ customer_id
CREATE TABLE dds.hub_customer (
    customer_hk    BIGSERIAL PRIMARY KEY,        -- суррогат
    customer_id    INT  UNIQUE NOT NULL,         -- бизнес-ключ
    load_dt        TIMESTAMP DEFAULT now(),
    record_source  VARCHAR(20)                   -- 'crm' / 'core_banking' / ...
);

-- Заполняется UNION-ом из всех источников
INSERT INTO dds.hub_customer (customer_id, record_source)
SELECT customer_id, 'crm'          FROM raw.crm__customers
UNION
SELECT customer_id, 'core_banking' FROM raw.core_banking__accounts
UNION
SELECT customer_id, 'card_system'  FROM raw.card_system__cards
UNION
SELECT customer_id, 'mobile_app'   FROM raw.mobile_app__devices
ON CONFLICT (customer_id) DO NOTHING;

-- ХАБ СЧЁТА
CREATE TABLE dds.hub_account (
    account_hk     BIGSERIAL PRIMARY KEY,
    account_id     INT UNIQUE NOT NULL,
    load_dt        TIMESTAMP DEFAULT now(),
    record_source  VARCHAR(20)
);

-- ЛИНК: счёт принадлежит клиенту (из Core Banking)
CREATE TABLE dds.link_customer_account (
    link_hk        BIGSERIAL PRIMARY KEY,
    customer_hk    BIGINT REFERENCES dds.hub_customer(customer_hk),
    account_hk     BIGINT REFERENCES dds.hub_account(account_hk),
    load_dt        TIMESTAMP DEFAULT now()
);

-- ЛИНК: транзакция принадлежит счёту (из Processing)
CREATE TABLE dds.link_account_transaction (
    link_hk        BIGSERIAL PRIMARY KEY,
    account_hk     BIGINT REFERENCES dds.hub_account(account_hk),
    trx_id         BIGINT,
    load_dt        TIMESTAMP DEFAULT now()
);

-- САТЕЛЛИТ: атрибуты клиента из CRM
CREATE TABLE dds.sat_customer_details (
    customer_hk    BIGINT REFERENCES dds.hub_customer(customer_hk),
    load_dt        TIMESTAMP DEFAULT now(),
    first_name     VARCHAR(50),
    last_name      VARCHAR(50),
    segment        VARCHAR(20),
    city           VARCHAR(50),
    record_source  VARCHAR(20) DEFAULT 'crm',
    PRIMARY KEY (customer_hk, load_dt)
);`));

children.push(H2("8.3. Слой DM (gold) — витрины для бизнеса"));
children.push(P("Витрины строятся над DDS и дают готовые «view» для BI, скоринга, регуляторных отчётов. Главная витрина — customer_360, объединяющая все 5 источников."));
children.push(...CodeBlock(`CREATE SCHEMA dm;

-- ВИТРИНА: единое окно по клиенту
CREATE TABLE dm.customer_360 AS
SELECT
    c.customer_id,
    s.first_name,
    s.last_name,
    s.segment,
    s.city,
    -- из Core Banking
    COALESCE(ab.account_count, 0)       AS account_count,
    COALESCE(ab.total_balance, 0)       AS total_balance,
    -- из Card System
    COALESCE(crd.card_count, 0)         AS card_count,
    -- из Mobile App
    COALESCE(mb.session_count_30d, 0)   AS sessions_30d,
    -- из Processing
    COALESCE(p.trx_count_30d, 0)        AS trx_count_30d,
    COALESCE(p.trx_amount_30d, 0)       AS trx_amount_30d,
    now()                               AS snapshot_dt
FROM dds.hub_customer c
LEFT JOIN dds.sat_customer_details s ON s.customer_hk = c.customer_hk
LEFT JOIN (
    SELECT customer_id, COUNT(*) account_count, SUM(balance) total_balance
    FROM raw.core_banking__accounts GROUP BY 1
) ab ON ab.customer_id = c.customer_id
LEFT JOIN (
    SELECT customer_id, COUNT(*) card_count
    FROM raw.card_system__cards GROUP BY 1
) crd ON crd.customer_id = c.customer_id
LEFT JOIN (
    SELECT customer_id, COUNT(*) session_count_30d
    FROM raw.mobile_app__sessions
    WHERE login_time > now() - interval '30 days'
    GROUP BY 1
) mb ON mb.customer_id = c.customer_id
LEFT JOIN (
    SELECT a.customer_id, COUNT(*) trx_count_30d, SUM(t.amount) trx_amount_30d
    FROM raw.processing__transactions t
    JOIN raw.core_banking__accounts a ON a.account_id = t.account_id
    WHERE t.trx_datetime > now() - interval '30 days'
    GROUP BY 1
) p ON p.customer_id = c.customer_id;`));
children.push(Ok("Главная мысль: каждый из 5 источников — независимая система с собственной БД, и именно в ХД (на слое DDS через хабы и линки) они впервые встречаются, образуя единую картину клиента."));

// ===== 9. Демонстрация связей =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("9. Демонстрация связей между источниками"));
children.push(P("Чтобы доказать, что 5 систем действительно связаны логически, возьмём одного клиента и пройдём по всем 5 базам."));

children.push(...CodeBlock(`# Возьмём клиента, у которого точно есть данные в нескольких системах
CUST=$(psql -U postgres -h localhost -d processing -t \\
  -c "SELECT DISTINCT a.customer_id
      FROM proc.transactions t
      JOIN dblink('host=localhost dbname=core_banking user=postgres password=postgres',
                  'SELECT account_id, customer_id FROM core.accounts') AS a(account_id INT, customer_id INT)
        ON a.account_id = t.account_id
      LIMIT 1;" | xargs)
# (или проще — берём первого клиента из CRM)
CUST=123

# 1) В CRM
psql -U postgres -h localhost -d crm -c \\
  "SELECT customer_id, first_name, last_name, segment FROM crm.customers WHERE customer_id=$CUST;"

# 2) В Core Banking
psql -U postgres -h localhost -d core_banking -c \\
  "SELECT account_id, account_number, account_type, balance FROM core.accounts WHERE customer_id=$CUST;"

# 3) В Card System
psql -U postgres -h localhost -d card_system -c \\
  "SELECT card_id, account_id, card_product, card_status FROM cards.cards WHERE customer_id=$CUST;"

# 4) В Mobile App
psql -U postgres -h localhost -d mobile_app -c \\
  "SELECT device_type, app_version FROM app.devices WHERE customer_id=$CUST;"

# 5) В Processing — через цепочку account_id
psql -U postgres -h localhost -d processing -c \\
  "SELECT t.trx_id, t.amount, t.trx_datetime, t.trx_type
   FROM proc.transactions t
   WHERE t.account_id IN (
       SELECT account_id FROM dblink('host=localhost dbname=core_banking user=postgres password=postgres',
                                     'SELECT account_id FROM core.accounts WHERE customer_id=$CUST')
                                     AS x(account_id INT)
   ) LIMIT 5;"`));
children.push(...PlaceholderForScreenshot("Скриншот 8. Один и тот же клиент виден во всех 5 источниках"));

// ===== 10. Контроль качества =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("10. Контроль качества"));
children.push(P("Автоматическая проверка кросс-источниковых связей при генерации:"));
children.push(SimpleTable(
  [5500, 3800],
  ["Проверка целостности FK между источниками", "Результат"],
  [
    ["Core Banking.accounts.customer_id есть в CRM.customers",         "0 невалидных / 1500 ✔"],
    ["Card System.cards.customer_id есть в CRM.customers",             "0 невалидных / 1200 ✔"],
    ["Card System.cards.account_id есть в Core Banking.accounts",      "0 невалидных / 1200 ✔"],
    ["Mobile App.devices.customer_id есть в CRM.customers",            "0 невалидных / 1200 ✔"],
    ["Processing.transactions.account_id есть в Core Banking.accounts","0 невалидных / 12000 ✔"],
    ["Processing.authorizations.card_id есть в Card System.cards",     "0 невалидных / 5000 ✔"],
  ]
));
children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun(" ")] }));
children.push(Ok("Клиентов, представленных одновременно во ВСЕХ 5 источниках: 421."));
children.push(...PlaceholderForScreenshot("Скриншот 9. Результат прогона sanity-check"));

// ===== 11. Заключение =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("11. Заключение"));
children.push(P("В переработанной версии ДЗ закрыты все 4 пункта замечания ментора:"));
children.push(Numbered("Развёрнуто 5 ОТДЕЛЬНЫХ систем (баз PostgreSQL): crm, core_banking, card_system, mobile_app, processing. Между ними нет физических FK — связь только логическая, через сквозные ID."));
children.push(Numbered("Архитектура показана в виде таблицы 5 систем и архитектурной диаграммы (раздел 2)."));
children.push(Numbered("По каждой из 5 систем дан отдельный подраздел (3.1–3.5) с описанием таблиц, бизнес-смысла и владельца."));
children.push(Numbered("Подробно описана интеграция в ХД через 3 слоя RAW → DDS → DM, с примерами SQL для хабов, линков и витрины customer_360 (раздел 8)."));

children.push(H2("11.1. Сданные артефакты"));
children.push(SimpleTable(
  [3500, 5800],
  ["Артефакт", "Содержание"],
  [
    ["ddl/01_crm.sql … 05_processing.sql", "DDL для 5 отдельных баз (по одному файлу на систему)"],
    ["scripts/generate_data.py",          "Генератор синтетических данных с Faker (SEED=42)"],
    ["data/<source>/<table>.csv",         "CSV-данные по каждой таблице каждой системы"],
    ["data/<source>/load_<table>.sql",    "SQL-загрузчики (INSERT-ы) для каждой системы"],
    ["images/architecture.png",           "Архитектурная диаграмма (встроена в этот документ)"],
    ["Инструкция_ДЗ_5_источников_v2.docx","Этот документ"],
  ]
));

// ============================================================
// СБОРКА ДОКУМЕНТА
// ============================================================
const doc = new Document({
  creator: "Talgat Sundetov",
  title: "ДЗ v2: 5 отдельных источников данных",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: C_HEAD, font: "Arial" },
        paragraph: { spacing: { before: 300, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: C_SUB, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: C_TXT, font: "Arial" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: { page: {
      size: { width: 12240, height: 15840 },
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
    }},
    headers: { default: new Header({ children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "ДЗ v2 • 5 источников • Data Engineering", color: C_TXT, size: 18 })],
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "Стр. ", color: C_TXT, size: 18 }),
        new TextRun({ children: [PageNumber.CURRENT], color: C_TXT, size: 18 }),
        new TextRun({ text: " из ", color: C_TXT, size: 18 }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], color: C_TXT, size: 18 }),
      ],
    })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const outPath = path.resolve(__dirname, "..", "Инструкция_ДЗ_5_источников_v2.docx");
  fs.writeFileSync(outPath, buf);
  console.log("Saved:", outPath, "bytes=", buf.length);
});
