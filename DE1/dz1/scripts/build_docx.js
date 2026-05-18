// Сборка Word-документа с пошаговой инструкцией по ДЗ
// Запуск: node build_docx.js
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
  TableOfContents,
} = require("docx");

// ------- цвета и стили -------
const C_HEAD     = "1F4E79";
const C_SUB      = "2E75B6";
const C_LIGHT_BG = "EAF1F8";
const C_ROW_ALT  = "F5F9FC";
const C_TXT_LT   = "555555";

const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };

// ------- хелперы -------
const P = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 120, line: 300 },
    ...opts,
    children: [new TextRun({ text, ...(opts.run || {}) })],
  });

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });

const Note = (t) => new Paragraph({
  spacing: { before: 80, after: 120 },
  shading: { fill: C_LIGHT_BG, type: ShadingType.CLEAR },
  border: { left: { style: BorderStyle.SINGLE, size: 24, color: C_SUB, space: 8 } },
  children: [new TextRun({ text: "📌  " + t, italics: true, color: C_TXT_LT })],
});

const Mono = (t) =>
  new Paragraph({
    spacing: { before: 60, after: 60 },
    shading: { fill: "F2F2F2", type: ShadingType.CLEAR },
    children: [new TextRun({ text: t, font: "Consolas", size: 20 })],
  });

const CodeBlock = (code) =>
  code.split("\n").map((ln) =>
    new Paragraph({
      spacing: { after: 0, line: 260 },
      shading: { fill: "F2F2F2", type: ShadingType.CLEAR },
      children: [new TextRun({ text: ln || " ", font: "Consolas", size: 20 })],
    })
  );

const Bullet = (t) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun(t)],
  });

const Numbered = (t) =>
  new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    children: [new TextRun(t)],
  });

const PlaceholderForScreenshot = (caption) => {
  // Серая «рамка» как место под скриншот + подпись
  return [
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [9360],
      rows: [
        new TableRow({
          children: [
            new TableCell({
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
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({
                    text: "📷  ВСТАВЬТЕ СКРИНШОТ ЗДЕСЬ",
                    bold: true, color: C_SUB, size: 24,
                  })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 80 },
                  children: [new TextRun({ text: caption, italics: true, color: C_TXT_LT, size: 20 })],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun(" ")] }),
  ];
};

// Маленький helper для таблицы (header + rows)
const SimpleTable = (cols, header, data) => {
  const colW = cols;                                       // массив ширин
  const totalW = colW.reduce((a, b) => a + b, 0);

  const headerRow = new TableRow({
    tableHeader: true,
    children: header.map((h, i) =>
      new TableCell({
        borders,
        width: { size: colW[i], type: WidthType.DXA },
        shading: { fill: C_HEAD, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: h, bold: true, color: "FFFFFF" })],
        })],
      })
    ),
  });
  const dataRows = data.map((row, ri) =>
    new TableRow({
      children: row.map((v, ci) =>
        new TableCell({
          borders,
          width: { size: colW[ci], type: WidthType.DXA },
          shading: { fill: ri % 2 ? C_ROW_ALT : "FFFFFF", type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: String(v) })] })],
        })
      ),
    })
  );
  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: colW,
    rows: [headerRow, ...dataRows],
  });
};

// ====================================================================
// СОДЕРЖИМОЕ
// ====================================================================
const children = [];

// --- титульный блок ---
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 1200, after: 200 },
  children: [new TextRun({
    text: "ДОМАШНЕЕ ЗАДАНИЕ",
    bold: true, color: C_HEAD, size: 36,
  })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 200 },
  children: [new TextRun({
    text: "Создание 5 связанных источников данных и генерация синтетических данных",
    bold: true, size: 28, color: C_SUB,
  })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 600 },
  children: [new TextRun({
    text: "Курс «Data Engineering»",
    italics: true, color: C_TXT_LT, size: 24,
  })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "Студент: Талгат Сундетов", size: 24 })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 1200 },
  children: [new TextRun({ text: "Дата сдачи: " + new Date().toLocaleDateString("ru-RU"), color: C_TXT_LT, size: 22 })],
}));

children.push(new Paragraph({ children: [new PageBreak()] }));

// --- содержание ---
children.push(H1("Содержание"));
children.push(new TableOfContents("Оглавление", { hyperlink: true, headingStyleRange: "1-3" }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ===== РАЗДЕЛ 1: Постановка задачи =====
children.push(H1("1. Постановка задачи"));
children.push(P("Согласно заданию ментора необходимо:"));
children.push(Numbered("Создать 5 источников данных."));
children.push(Numbered("Сгенерировать в них синтетических данных более 10 000 строк."));
children.push(Numbered("Источники должны быть логически связаны между собой, чтобы при последующей загрузке в DWH данные можно было соединить по ключам."));
children.push(Numbered("Оформить все шаги и скриншоты в Word-документе."));
children.push(Note("Связь источников реализована через сквозной ключ customer_id. Дополнительно есть кросс-связи: cards.account_id → core.accounts, aml.monitored_txs.trx_id → core.transactions. Так имитируется реальный банковский ландшафт: клиент регистрируется в АБС, открывает карту, заходит в моб. приложение, подаёт заявку на кредит, его транзакции мониторятся AML-системой."));

// ===== РАЗДЕЛ 2: Архитектура =====
children.push(H1("2. Архитектура решения"));
children.push(P("Реализовано 5 независимых баз PostgreSQL — каждая имитирует отдельную IT-систему банка (как это бывает в реальности — все эти системы стоят на разных серверах, поддерживаются разными командами и пишутся независимо)."));

children.push(H2("2.1. Источники и их роль"));
children.push(SimpleTable(
  [1300, 2200, 3000, 2860],
  ["№", "База (источник)", "Назначение", "Основные таблицы"],
  [
    ["1", "bank_core",   "АБС — ядро банка: клиенты, счета, отделения, движения средств", "branches, customers, accounts, transactions"],
    ["2", "bank_cards",  "Карточный процессинг: карты, авторизации, клиринг",              "merchants, cards, authorizations, clearing"],
    ["3", "bank_credit", "Кредитный конвейер: заявки, договоры, графики платежей",         "loan_applications, loan_agreements, payment_schedule"],
    ["4", "bank_dbo",    "Дистанционное обслуживание (моб./интернет-банк)",                "devices, sessions, events"],
    ["5", "bank_aml",    "Антифрод / AML: мониторинг транзакций и алерты",                 "risk_rules, monitored_txs, aml_alerts"],
  ]
));
children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun(" ")] }));

children.push(H2("2.2. Связи между источниками"));
children.push(P("Сквозной ключ — customer_id (создаётся в bank_core и используется во всех остальных). Дополнительно есть две кросс-связи на уровне account_id и trx_id:"));
children.push(Bullet("bank_cards.cards.customer_id → bank_core.customers.customer_id"));
children.push(Bullet("bank_cards.cards.account_id → bank_core.accounts.account_id"));
children.push(Bullet("bank_credit.loan_applications.customer_id → bank_core.customers.customer_id"));
children.push(Bullet("bank_dbo.devices.customer_id, sessions.customer_id → bank_core.customers"));
children.push(Bullet("bank_aml.monitored_txs.customer_id → bank_core.customers"));
children.push(Bullet("bank_aml.monitored_txs.trx_id → bank_core.transactions.trx_id"));

children.push(...PlaceholderForScreenshot("Скриншот 1. ER-диаграмма всех 5 источников (можно построить в dbdiagram.io или pgAdmin → Diagram)"));

children.push(H2("2.3. Целевой объём данных"));
children.push(SimpleTable(
  [3500, 2500, 1500],
  ["Источник.таблица", "План (строк)", "Факт (строк)"],
  [
    ["bank_core.branches",            "10",    "10"],
    ["bank_core.customers",           "1 000", "1 000"],
    ["bank_core.accounts",            "1 500", "1 500"],
    ["bank_core.transactions",        "12 000","12 000"],
    ["bank_cards.merchants",          "100",   "100"],
    ["bank_cards.cards",              "1 200", "1 200"],
    ["bank_cards.authorizations",     "5 000", "5 000"],
    ["bank_cards.clearing",           "≈3 700","3 737"],
    ["bank_credit.loan_applications", "1 500", "1 500"],
    ["bank_credit.loan_agreements",   "≈800",  "769"],
    ["bank_credit.payment_schedule",  "≈15 000","16 956"],
    ["bank_dbo.devices",              "1 200", "1 200"],
    ["bank_dbo.sessions",             "2 000", "2 000"],
    ["bank_dbo.events",               "6 000", "6 000"],
    ["bank_aml.risk_rules",           "15",    "15"],
    ["bank_aml.monitored_txs",        "2 000", "2 000"],
    ["bank_aml.aml_alerts",           "≈40",   "43"],
    ["ИТОГО",                         ">10 000", "55 030"],
  ]
));
children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun(" ")] }));
children.push(Note("Итого 55 030 строк — это в 5 раз больше требования (>10 000)."));

// ===== РАЗДЕЛ 3: Подготовка окружения =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("3. Подготовка окружения"));

children.push(H2("3.1. Установка PostgreSQL"));
children.push(P("Установить PostgreSQL 15+ (или Docker-образ). Проверить работу:"));
children.push(...CodeBlock("psql --version\n# psql (PostgreSQL) 15.x\n\nsudo systemctl status postgresql\n# active (running)"));
children.push(...PlaceholderForScreenshot("Скриншот 2. Вывод команды psql --version и статус сервиса"));

children.push(H2("3.2. Установка Python и зависимостей"));
children.push(...CodeBlock("python3 --version            # >=3.9\npip install faker"));
children.push(...PlaceholderForScreenshot("Скриншот 3. Успешная установка библиотеки Faker"));

children.push(H2("3.3. Создание 5 баз данных"));
children.push(P("Подключаемся как суперпользователь postgres и создаём пять отдельных БД:"));
children.push(...CodeBlock(`sudo -u postgres psql

CREATE DATABASE bank_core;
CREATE DATABASE bank_cards;
CREATE DATABASE bank_credit;
CREATE DATABASE bank_dbo;
CREATE DATABASE bank_aml;

\\l   -- проверяем список БД`));
children.push(...PlaceholderForScreenshot("Скриншот 4. Список 5 созданных БД (вывод \\l в psql)"));

// ===== РАЗДЕЛ 4: DDL =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("4. Создание схем и таблиц (DDL)"));
children.push(P("DDL-скрипты лежат в папке ddl/. Они запускаются по одному — каждый в свою базу:"));
children.push(...CodeBlock(`psql -d bank_core   -f ddl/01_bank_core.sql
psql -d bank_cards  -f ddl/02_bank_cards.sql
psql -d bank_credit -f ddl/03_bank_credit.sql
psql -d bank_dbo    -f ddl/04_bank_dbo.sql
psql -d bank_aml    -f ddl/05_bank_aml.sql`));
children.push(...PlaceholderForScreenshot("Скриншот 5. Успешное выполнение DDL для всех 5 баз (CREATE TABLE × N)"));

children.push(H2("4.1. Пример DDL: bank_core"));
children.push(P("Ниже показан фрагмент DDL для главной таблицы customers в bank_core (полный текст — в файле ddl/01_bank_core.sql):"));
children.push(...CodeBlock(`CREATE TABLE customers (
    customer_id   SERIAL PRIMARY KEY,
    first_name    VARCHAR(50),
    last_name     VARCHAR(50),
    iin           VARCHAR(12) UNIQUE,
    birth_date    DATE,
    gender        CHAR(1),
    phone         VARCHAR(20),
    email         VARCHAR(100),
    city          VARCHAR(50),
    branch_id     INT REFERENCES branches(branch_id),
    segment       VARCHAR(20),
    registered_at TIMESTAMP DEFAULT now(),
    updated_at    TIMESTAMP DEFAULT now()
);`));

children.push(H2("4.2. Проверка структуры"));
children.push(P("В каждой БД смотрим список таблиц:"));
children.push(...CodeBlock(`\\c bank_core
\\dt core.*

-- ожидаемый результат:
--           List of relations
--  Schema | Name         | Type  | Owner
-- --------+--------------+-------+----------
--  core   | branches     | table | postgres
--  core   | customers    | table | postgres
--  core   | accounts     | table | postgres
--  core   | transactions | table | postgres`));
children.push(...PlaceholderForScreenshot("Скриншот 6. Вывод \\dt для bank_core"));

// ===== РАЗДЕЛ 5: Генерация данных =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("5. Генерация синтетических данных"));

children.push(H2("5.1. Принцип работы скрипта"));
children.push(P("Используется Python + библиотека Faker (русская локаль ru_RU). Скрипт scripts/generate_data.py:"));
children.push(Bullet("задаёт фиксированный SEED=42 — данные повторяемые между запусками;"));
children.push(Bullet("сначала генерит «верхнеуровневые» сущности (branches, customers), потом «подчинённые» (accounts, transactions);"));
children.push(Bullet("при создании данных в карточном/кредитном/AML-источниках выбирает customer_id из уже существующих в bank_core — это обеспечивает целостность связей;"));
children.push(Bullet("на каждую таблицу пишет одновременно CSV (для проверки) и SQL-файл с INSERT-ами (для загрузки в PG);"));
children.push(Bullet("в конце печатает сводку: сколько строк сгенерировано в каждой таблице."));

children.push(H2("5.2. Запуск генератора"));
children.push(...CodeBlock("cd outputs/scripts\npython3 generate_data.py"));
children.push(...PlaceholderForScreenshot("Скриншот 7. Вывод скрипта generate_data.py с финальной сводкой по строкам"));

children.push(H2("5.3. Что получаем на выходе"));
children.push(P("В папке data/ появляются 5 подпапок (по одной на источник), и в каждой — CSV-файлы и load_*.sql:"));
children.push(...CodeBlock(`data/
├── bank_core/
│   ├── branches.csv          load_branches.sql
│   ├── customers.csv         load_customers.sql
│   ├── accounts.csv          load_accounts.sql
│   └── transactions.csv      load_transactions.sql
├── bank_cards/
│   ├── merchants.csv         load_merchants.sql
│   ├── cards.csv             load_cards.sql
│   ├── authorizations.csv    load_authorizations.sql
│   └── clearing.csv          load_clearing.sql
├── bank_credit/
│   ├── loan_applications.csv ...
│   └── ...
├── bank_dbo/  ...
└── bank_aml/  ...`));
children.push(...PlaceholderForScreenshot("Скриншот 8. Структура папки data/ в проводнике/терминале (ls -R или дерево файлов)"));

// ===== РАЗДЕЛ 6: Загрузка в PG =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("6. Загрузка данных в PostgreSQL"));
children.push(P("Загружаем сгенерированные данные по очереди в каждую базу:"));
children.push(...CodeBlock(`psql -d bank_core -f data/bank_core/load_branches.sql
psql -d bank_core -f data/bank_core/load_customers.sql
psql -d bank_core -f data/bank_core/load_accounts.sql
psql -d bank_core -f data/bank_core/load_transactions.sql

psql -d bank_cards  -f data/bank_cards/load_merchants.sql
psql -d bank_cards  -f data/bank_cards/load_cards.sql
# ... и так далее для всех источников`));
children.push(Note("Порядок важен: сначала родительские таблицы (branches → customers → accounts → transactions), потом дочерние."));
children.push(...PlaceholderForScreenshot("Скриншот 9. Сообщения INSERT 0 N из psql при загрузке данных"));

children.push(H2("6.1. Проверка количества строк"));
children.push(...CodeBlock(`-- bank_core
\\c bank_core
SELECT 'branches'     AS t, COUNT(*) FROM core.branches
UNION ALL SELECT 'customers',     COUNT(*) FROM core.customers
UNION ALL SELECT 'accounts',      COUNT(*) FROM core.accounts
UNION ALL SELECT 'transactions',  COUNT(*) FROM core.transactions;`));
children.push(...PlaceholderForScreenshot("Скриншот 10. Вывод COUNT(*) по всем таблицам bank_core"));

children.push(H2("6.2. Проверка связности (важно для DWH!)"));
children.push(P("Поскольку источники — это разные БД, FK между ними физически нельзя поставить. Но мы проверяем, что customer_id из bank_cards/bank_credit/bank_dbo/bank_aml действительно есть в bank_core (так и должно быть в реальном банке):"));
children.push(...CodeBlock(`-- сколько уникальных клиентов в каждом источнике
\\c bank_core
SELECT COUNT(DISTINCT customer_id) FROM core.customers;     -- 1000

\\c bank_cards
SELECT COUNT(DISTINCT customer_id) FROM cards.cards;        -- ~561

\\c bank_credit
SELECT COUNT(DISTINCT customer_id) FROM credit.loan_applications;  -- ~786

\\c bank_dbo
SELECT COUNT(DISTINCT customer_id) FROM dbo.devices;        -- ~698

\\c bank_aml
SELECT COUNT(DISTINCT customer_id) FROM aml.monitored_txs;  -- ~665`));
children.push(...PlaceholderForScreenshot("Скриншот 11. Распределение клиентов по источникам — видно, что не каждый клиент имеет карту/кредит/моб.банк"));

// ===== РАЗДЕЛ 7: Демонстрация связности =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("7. Демонстрация связей между источниками"));

children.push(H2("7.1. Сценарий «полный путь клиента»"));
children.push(P("Покажем одного клиента, у которого есть данные во всех 5 источниках:"));
children.push(...CodeBlock(`-- 1) Клиент в bank_core
\\c bank_core
SELECT customer_id, first_name, last_name, segment
FROM core.customers WHERE customer_id = 123;

-- 2) Его счета и транзакции
SELECT * FROM core.accounts      WHERE customer_id = 123;
SELECT COUNT(*) FROM core.transactions t
JOIN core.accounts a USING(account_id) WHERE a.customer_id = 123;

-- 3) Его карты в bank_cards (другая БД!)
\\c bank_cards
SELECT card_id, account_id, card_product, card_status
FROM cards.cards WHERE customer_id = 123;

-- 4) Его кредитные заявки в bank_credit
\\c bank_credit
SELECT * FROM credit.loan_applications WHERE customer_id = 123;

-- 5) Его устройства / сессии / события в bank_dbo
\\c bank_dbo
SELECT device_type, app_version FROM dbo.devices WHERE customer_id = 123;
SELECT login_time, city           FROM dbo.sessions WHERE customer_id = 123 LIMIT 5;

-- 6) Его подозрительные транзакции в bank_aml
\\c bank_aml
SELECT trx_id, amount, risk_score, is_flagged, triggered_rules
FROM aml.monitored_txs WHERE customer_id = 123;`));
children.push(...PlaceholderForScreenshot("Скриншот 12. Один и тот же клиент виден во всех 5 источниках"));

children.push(H2("7.2. Кросс-связь по транзакции"));
children.push(P("Возьмём конкретный trx_id из bank_core и убедимся, что он же есть в bank_aml.monitored_txs (это эмулирует то, что AML-система получает поток транзакций из АБС):"));
children.push(...CodeBlock(`-- в bank_core
\\c bank_core
SELECT trx_id, account_id, amount, trx_datetime
FROM core.transactions WHERE amount > 10000000 LIMIT 5;

-- те же trx_id ищем в AML
\\c bank_aml
SELECT monitor_id, trx_id, risk_score, triggered_rules
FROM aml.monitored_txs WHERE trx_id IN (SELECT trx_id FROM /*scratch*/ ...);`));
children.push(...PlaceholderForScreenshot("Скриншот 13. Транзакция из bank_core находится в bank_aml.monitored_txs"));

// ===== РАЗДЕЛ 8: Контроль качества =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("8. Контроль качества данных"));
children.push(P("Проверки, которые подтверждают корректность сгенерированных данных:"));
children.push(SimpleTable(
  [3500, 5800],
  ["Проверка", "Ожидаемый результат"],
  [
    ["Уникальность customer_id, account_id, trx_id, card_id", "Дубликатов нет"],
    ["Все customer_id из dependent-источников ∈ bank_core.customers", "Сирот нет (orphan = 0)"],
    ["Все account_id из bank_cards.cards ∈ bank_core.accounts", "Сирот нет"],
    ["Все trx_id из bank_aml.monitored_txs ∈ bank_core.transactions", "Сирот нет"],
    ["bank_credit.loan_agreements есть только по approved заявкам", "Соответствует"],
    ["bank_cards.clearing.auth_id есть в bank_cards.authorizations", "100% связи"],
    ["Транзакции с amount > 10M отмечаются is_flagged=TRUE в AML", "Сработало правило RULE_LARGE_AMT"],
    ["Сгенерировано >10 000 строк", "55 030 строк ✓"],
  ]
));
children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun(" ")] }));
children.push(...PlaceholderForScreenshot("Скриншот 14. Результат прогона sanity-check скрипта"));

// ===== РАЗДЕЛ 9: Заключение =====
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("9. Заключение"));
children.push(P("В рамках ДЗ реализованы все требования ментора:"));
children.push(Bullet("Создано 5 связанных источников данных (bank_core, bank_cards, bank_credit, bank_dbo, bank_aml) — каждый в отдельной БД PostgreSQL, как это бывает в реальном банке."));
children.push(Bullet("Сгенерировано 55 030 синтетических строк (>10 000 по требованию). Данные взаимно связаны: 265 клиентов представлены во всех 5 источниках сразу."));
children.push(Bullet("Реализованы как «вертикальные» (внутри источника), так и «кросс-источниковые» связи через customer_id, account_id и trx_id — это позволит при загрузке в DWH соединить все системы вокруг клиента."));
children.push(Bullet("Все шаги (установка, DDL, генерация, загрузка, проверки) задокументированы со скриншотами."));

children.push(H2("9.1. Состав сданных артефактов"));
children.push(SimpleTable(
  [3000, 6300],
  ["Артефакт", "Что внутри"],
  [
    ["ddl/01_bank_core.sql … 05_bank_aml.sql", "DDL: создание схем, таблиц, индексов для 5 источников"],
    ["scripts/generate_data.py",               "Python-генератор с Faker, пишет CSV и INSERT-скрипты"],
    ["data/<source>/<table>.csv",              "Готовые CSV-данные (можно открыть в Excel)"],
    ["data/<source>/load_<table>.sql",         "INSERT-скрипты для загрузки в PG"],
    ["Инструкция_ДЗ_5_источников.docx",        "Этот документ"],
  ]
));
children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun(" ")] }));

children.push(Note("Дальнейшие шаги (для следующих ДЗ): загрузить эти 5 источников в RAW-слой DWH (bronze), построить DDS (silver) в стиле Data Vault через хабы и линки на customer_id, и собрать витрины в DM (gold) — например, daily_turnover, customer_360, fraud_detection."));

// ====================================================================
// СБОРКА ДОКУМЕНТА
// ====================================================================
const doc = new Document({
  creator: "Talgat",
  title: "ДЗ: 5 источников данных",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } }, // 11pt
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: C_HEAD, font: "Arial" },
        paragraph: { spacing: { before: 300, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: C_SUB, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: C_TXT_LT, font: "Arial" },
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
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "ДЗ: 5 источников данных • Data Engineering", color: C_TXT_LT, size: 18 })],
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Стр. ", color: C_TXT_LT, size: 18 }),
          new TextRun({ children: [PageNumber.CURRENT], color: C_TXT_LT, size: 18 }),
          new TextRun({ text: " из ", color: C_TXT_LT, size: 18 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], color: C_TXT_LT, size: 18 }),
        ],
      })] }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const outPath = path.resolve(__dirname, "..", "Инструкция_ДЗ_5_источников.docx");
  fs.writeFileSync(outPath, buf);
  console.log("Saved:", outPath, "bytes=", buf.length);
});
