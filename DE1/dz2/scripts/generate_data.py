"""
Генератор синтетических данных для 5 ОТДЕЛЬНЫХ источников банка.

5 разных систем (каждая = отдельная БД PostgreSQL):
  1) CRM           — клиенты и их контакты
  2) Core Banking  — счета и отделения (АБС)
  3) Card System   — карты, мерчанты, блокировки
  4) Mobile App    — устройства, сессии, события в моб.приложении
  5) Processing    — транзакции по счетам и картам, клиринг

Связи между источниками реализованы как ЛОГИЧЕСКИЕ FK
(на уровне ID, без физических CONSTRAINT — ведь источники в разных БД).

Что делает скрипт:
  A) Пишет CSV     в ./data/<source>/<table>.csv
  B) Пишет INSERTы в ./data/<source>/load_<table>.sql

Запуск:
  pip install faker --break-system-packages
  python3 generate_data.py
"""

import csv
import hashlib
import random
import string
from datetime import datetime, timedelta
from pathlib import Path

from faker import Faker

# ---------------------------------------------------------------------------
# Конфиг
# ---------------------------------------------------------------------------
SEED = 42

# CRM
N_CUSTOMERS      = 1000
N_CONTACTS       = 2500              # ≈2.5 контакта на клиента
N_SEG_HISTORY    = 1400              # история изменения сегментов

# Core Banking
N_BRANCHES       = 10
N_ACCOUNTS       = 1500
N_TURNOVERS      = 6000              # дневные обороты (часть счетов × часть дней)

# Card System
N_MERCHANTS      = 100
N_CARDS          = 1200
N_CARD_BLOCKS    = 250

# Mobile App
N_DEVICES        = 1200
N_SESSIONS       = 2000
N_EVENTS         = 6000

# Processing
N_TRANSACTIONS   = 12000
N_AUTHORIZATIONS = 5000
# clearing ≈ 80% от approved авторизаций

OUT_DIR = Path(__file__).resolve().parent.parent / "data"

random.seed(SEED)
fake = Faker("ru_RU")
Faker.seed(SEED)

# ---------------------------------------------------------------------------
# Справочники
# ---------------------------------------------------------------------------
CITIES = [
    "Almaty", "Astana", "Shymkent", "Karaganda", "Aktobe",
    "Taraz", "Pavlodar", "Oskemen", "Semey", "Atyrau",
]
SEGMENTS = ["mass", "mass", "mass", "mass", "premium", "premium", "wealth"]
ACCOUNT_TYPES = ["current", "current", "current", "savings", "deposit"]
CARD_PRODUCTS = ["classic", "classic", "classic", "gold", "gold", "platinum"]
DEVICE_TYPES = ["ios", "android", "android", "android", "web"]
EVENT_TYPES = [
    "login", "view_balance", "make_transfer", "pay_utility",
    "open_card", "view_history", "logout", "change_password",
]
AUTH_METHODS = ["password", "biometric", "biometric", "otp"]


def iin() -> str:
    return "".join(random.choices(string.digits, k=12))


def acct_number() -> str:
    return "KZ" + "".join(random.choices(string.digits, k=18))


def random_dt(days_back: int = 365) -> datetime:
    end = datetime(2025, 12, 31)
    return end - timedelta(
        days=random.randint(0, days_back),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
        seconds=random.randint(0, 59),
    )


def pan_hash(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Утилиты записи
# ---------------------------------------------------------------------------
def _sql_lit(v):
    if v is None or v == "":
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, datetime):
        return "'" + v.strftime("%Y-%m-%d %H:%M:%S") + "'"
    s = str(v).replace("'", "''")
    return f"'{s}'"


def write_csv(source: str, table: str, header: list, rows: list):
    folder = OUT_DIR / source
    folder.mkdir(parents=True, exist_ok=True)
    fpath = folder / f"{table}.csv"
    with open(fpath, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    print(f"  CSV  data/{source}/{table}.csv  rows={len(rows)}")


def write_sql(source: str, table: str, schema: str, header: list, rows: list):
    folder = OUT_DIR / source
    folder.mkdir(parents=True, exist_ok=True)
    fpath = folder / f"load_{table}.sql"
    cols = ",".join(header)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(f"-- INSERTs для источника {source}, таблица {schema}.{table}\n")
        f.write(f"SET search_path TO {schema};\n")
        f.write(f"TRUNCATE {table} RESTART IDENTITY CASCADE;\n")
        batch = 500
        for i in range(0, len(rows), batch):
            chunk = rows[i:i + batch]
            f.write(f"INSERT INTO {table}({cols}) VALUES\n")
            vals = ["(" + ",".join(_sql_lit(v) for v in r) + ")" for r in chunk]
            f.write(",\n".join(vals) + ";\n")
    print(f"  SQL  data/{source}/load_{table}.sql")


def emit(source: str, table: str, schema: str, header: list, rows: list):
    write_csv(source, table, header, rows)
    write_sql(source, table, schema, header, rows)


# ===========================================================================
# 1) CRM
# ===========================================================================
print("\n========== Источник 1: CRM ==========")

customers = []
for i in range(1, N_CUSTOMERS + 1):
    gender = random.choice(["M", "F"])
    first = fake.first_name_male() if gender == "M" else fake.first_name_female()
    last = fake.last_name_male() if gender == "M" else fake.last_name_female()
    reg_dt = random_dt(days_back=1000)
    customers.append([
        i, first, last, iin(),
        (datetime(1960, 1, 1) + timedelta(days=random.randint(0, 60 * 365))).date(),
        gender, random.choice(CITIES), random.choice(SEGMENTS),
        random.randint(1, 50),                      # manager_id
        reg_dt, reg_dt + timedelta(days=random.randint(0, 200)),
    ])
emit("crm", "customers", "crm",
     ["customer_id", "first_name", "last_name", "iin", "birth_date", "gender",
      "city", "segment", "manager_id", "registered_at", "updated_at"],
     customers)

# контакты: phone + email + address для большинства, кому-то +доп.телефон
customer_contacts = []
cid = 0
for c in customers:
    customer_id = c[0]
    # primary phone
    cid += 1
    customer_contacts.append([cid, customer_id, "phone", fake.phone_number()[:20], True, True, c[9]])
    # primary email
    cid += 1
    customer_contacts.append([cid, customer_id, "email",
                              f"{c[1].lower()}.{c[2].lower()}{customer_id}@example.kz", True, True, c[9]])
    # address
    cid += 1
    customer_contacts.append([cid, customer_id, "address", fake.address().replace("\n", ", ")[:200], True, False, c[9]])
    # ещё немного — дополнительный телефон у части клиентов
    if random.random() < 0.5 and cid < N_CONTACTS:
        cid += 1
        customer_contacts.append([cid, customer_id, "phone", fake.phone_number()[:20], False, False, c[9]])
emit("crm", "customer_contacts", "crm",
     ["contact_id", "customer_id", "contact_type", "contact_value",
      "is_primary", "verified", "created_at"],
     customer_contacts)

# история сегментов: у части клиентов был апгрейд/даунгрейд
segments_history = []
hid = 0
reasons = ["onboarding", "income_growth", "vip_offer", "churn_risk", "annual_review"]
for c in customers:
    cust_id, cur_seg, reg = c[0], c[7], c[9]
    # точно одна запись — первичный сегмент
    hid += 1
    segments_history.append([hid, cust_id, cur_seg, reg.date(), None, "onboarding"])
    # с вероятностью 30% — был ещё переход
    if random.random() < 0.3 and hid < N_SEG_HISTORY:
        hid += 1
        old = random.choice(["mass", "premium"])
        change_dt = (reg + timedelta(days=random.randint(60, 800))).date()
        segments_history.append([hid, cust_id, old, reg.date(),
                                 change_dt, random.choice(reasons)])
emit("crm", "customer_segments_history", "crm",
     ["history_id", "customer_id", "segment", "valid_from", "valid_to", "reason"],
     segments_history)


# ===========================================================================
# 2) Core Banking
# ===========================================================================
print("\n========== Источник 2: Core Banking ==========")

branches = []
for i in range(1, N_BRANCHES + 1):
    city = random.choice(CITIES)
    branches.append([
        i, f"BR{str(i).zfill(4)}", f"{city} филиал {i}", city,
        fake.street_address(),
        (datetime(2010, 1, 1) + timedelta(days=random.randint(0, 4000))).date(),
        True,
    ])
emit("core_banking", "branches", "core",
     ["branch_id", "branch_code", "branch_name", "city", "address", "opened_date", "is_active"],
     branches)

accounts = []
for i in range(1, N_ACCOUNTS + 1):
    cust = random.randint(1, N_CUSTOMERS)             # ← логич. FK на crm.customers
    opened = random_dt(days_back=900)
    accounts.append([
        i, acct_number(), cust, random.randint(1, N_BRANCHES),
        random.choice(ACCOUNT_TYPES), "KZT",
        round(random.uniform(0, 5_000_000), 2),
        opened, None, "active",
        opened + timedelta(days=random.randint(0, 200)),
    ])
emit("core_banking", "accounts", "core",
     ["account_id", "account_number", "customer_id", "branch_id", "account_type",
      "currency", "balance", "opened_at", "closed_at", "status", "updated_at"],
     accounts)

# дневные обороты: берём случайные пары (счёт, дата), агрегируем суммы
turnovers = []
seen = set()
while len(turnovers) < N_TURNOVERS:
    acc_id = random.randint(1, N_ACCOUNTS)
    biz_date = (datetime(2025, 1, 1) + timedelta(days=random.randint(0, 365))).date()
    key = (acc_id, biz_date)
    if key in seen:
        continue
    seen.add(key)
    cr = round(random.uniform(0, 800_000), 2)
    db = round(random.uniform(0, 800_000), 2)
    closing = round(random.uniform(0, 4_000_000), 2)
    turnovers.append([len(turnovers) + 1, acc_id, biz_date, cr, db, closing])
emit("core_banking", "daily_turnovers", "core",
     ["turnover_id", "account_id", "business_date", "total_credit",
      "total_debit", "closing_balance"],
     turnovers)


# ===========================================================================
# 3) Card System
# ===========================================================================
print("\n========== Источник 3: Card System ==========")

merchants = []
mcc_map = [
    ("5411", "grocery"), ("5541", "fuel"), ("5812", "restaurant"),
    ("5912", "pharmacy"), ("5732", "electronics"), ("7995", "gambling"),
    ("4111", "transport"), ("4900", "utility"), ("5999", "other"),
]
for i in range(1, N_MERCHANTS + 1):
    mcc, cat = random.choice(mcc_map)
    merchants.append([i, fake.company()[:100], mcc, cat, random.choice(CITIES), "KZ"])
emit("card_system", "merchants", "cards",
     ["merchant_id", "merchant_name", "mcc", "category", "city", "country"],
     merchants)

cards = []
account_pool = [(a[0], a[2]) for a in accounts]    # (account_id, customer_id)
for i in range(1, N_CARDS + 1):
    acc_id, cust_id = random.choice(account_pool)  # ← кросс-FK на core_banking + crm
    issue = random_dt(days_back=700)
    cards.append([
        i, cust_id, acc_id,
        pan_hash(f"{i}-{cust_id}-{random.random()}"),
        random.choice(CARD_PRODUCTS),
        (issue + timedelta(days=365 * 3)).date(),
        issue.date(),
        random.choices(["active", "blocked", "expired"], weights=[90, 5, 5])[0],
        f"{fake.first_name()[:1]} {fake.last_name()[:20]}".upper(),
        issue + timedelta(days=random.randint(0, 100)),
    ])
emit("card_system", "cards", "cards",
     ["card_id", "customer_id", "account_id", "card_pan_hash", "card_product",
      "expiry_date", "issue_date", "card_status", "embossed_name", "updated_at"],
     cards)

card_blocks = []
block_reasons = ["lost", "stolen", "suspicious", "customer_request", "expired"]
blocked_bys = ["customer", "fraud_team", "system", "customer"]
for i in range(1, N_CARD_BLOCKS + 1):
    card_id = random.randint(1, N_CARDS)
    bl = random_dt(days_back=300)
    is_unblocked = random.random() > 0.5
    unbl = bl + timedelta(days=random.randint(1, 30)) if is_unblocked else None
    card_blocks.append([
        i, card_id, random.choice(block_reasons), bl, unbl, random.choice(blocked_bys)
    ])
emit("card_system", "card_blocks", "cards",
     ["block_id", "card_id", "block_reason", "blocked_at", "unblocked_at", "blocked_by"],
     card_blocks)


# ===========================================================================
# 4) Mobile App
# ===========================================================================
print("\n========== Источник 4: Mobile App ==========")

devices = []
for i in range(1, N_DEVICES + 1):
    cust = random.randint(1, N_CUSTOMERS)
    dt = random_dt(days_back=600)
    devices.append([
        i, cust, random.choice(DEVICE_TYPES),
        f"{random.randint(10,18)}.{random.randint(0,5)}",
        f"{random.randint(3,7)}.{random.randint(0,20)}.{random.randint(0,9)}",
        "".join(random.choices(string.hexdigits.lower(), k=64))[:64],
        random.random() > 0.1,
        dt, dt + timedelta(days=random.randint(0, 200)),
    ])
emit("mobile_app", "devices", "app",
     ["device_id", "customer_id", "device_type", "os_version", "app_version",
      "push_token", "is_trusted", "first_seen_at", "last_seen_at"],
     devices)

sessions = []
session_ids = []
for i in range(1, N_SESSIONS + 1):
    cust = random.randint(1, N_CUSTOMERS)
    dev_pool = [d[0] for d in devices if d[1] == cust]
    device_id = random.choice(dev_pool) if dev_pool else random.randint(1, N_DEVICES)
    login = random_dt(days_back=120)
    logout = login + timedelta(minutes=random.randint(1, 60))
    sid = "".join(random.choices(string.hexdigits.lower(), k=32))
    sessions.append([
        sid, cust, device_id, login, logout, fake.ipv4(),
        random.choice(CITIES), random.random() > 0.03, random.choice(AUTH_METHODS),
    ])
    session_ids.append(sid)
emit("mobile_app", "sessions", "app",
     ["session_id", "customer_id", "device_id", "login_time", "logout_time",
      "ip_address", "city", "is_successful", "auth_method"],
     sessions)

events = []
session_map = {s[0]: s for s in sessions}
for i in range(1, N_EVENTS + 1):
    sid = random.choice(session_ids)
    sess = session_map[sid]
    ev_time = sess[3] + timedelta(seconds=random.randint(0, 1800))
    et = random.choice(EVENT_TYPES)
    amount = round(random.uniform(100, 200_000), 2) if et in ("make_transfer", "pay_utility") else None
    ok = random.random() > 0.05
    events.append([
        i, sid, ev_time, et, amount,
        acct_number() if amount else None, ok,
        None if ok else random.choice(["timeout", "validation_failed", "auth_error"]),
    ])
emit("mobile_app", "events", "app",
     ["event_id", "session_id", "event_time", "event_type", "amount",
      "target_account", "is_successful", "error_message"],
     events)


# ===========================================================================
# 5) Processing
# ===========================================================================
print("\n========== Источник 5: Processing ==========")

transactions = []
for i in range(1, N_TRANSACTIONS + 1):
    acc = random.randint(1, N_ACCOUNTS)              # ← кросс-FK на core_banking.accounts
    br = random.randint(1, N_BRANCHES)
    ttype = random.choice(["debit", "credit", "credit", "transfer"])
    amount = round(random.uniform(100, 500_000), 2)
    if random.random() < 0.01:
        amount = round(random.uniform(2_000_000, 20_000_000), 2)
    dt = random_dt(days_back=180)
    transactions.append([
        i, acc, dt, ttype, amount, "KZT",
        fake.sentence(nb_words=4)[:200], fake.company()[:100],
        dt.date(), br, dt,
    ])
emit("processing", "transactions", "proc",
     ["trx_id", "account_id", "trx_datetime", "trx_type", "amount", "currency",
      "description", "counterparty", "posting_date", "branch_id", "updated_at"],
     transactions)

authorizations = []
for i in range(1, N_AUTHORIZATIONS + 1):
    card_id = random.randint(1, N_CARDS)             # ← кросс-FK на card_system.cards
    merch_id = random.randint(1, N_MERCHANTS)
    dt = random_dt(days_back=180)
    is_approved = random.random() > 0.07
    authorizations.append([
        i, card_id, merch_id, dt,
        round(random.uniform(50, 80_000), 2), "KZT",
        "".join(random.choices(string.digits, k=6)),
        "approved" if is_approved else "declined",
        None if is_approved else random.choice(["insufficient_funds", "card_blocked", "limit_exceeded"]),
        True,
    ])
emit("processing", "authorizations", "proc",
     ["auth_id", "card_id", "merchant_id", "auth_datetime", "amount", "currency",
      "auth_code", "auth_result", "decline_reason", "is_online"],
     authorizations)

clearing = []
approved = [a for a in authorizations if a[7] == "approved"]
random.shuffle(approved)
clearing_sample = approved[: int(len(approved) * 0.8)]
for idx, a in enumerate(clearing_sample, start=1):
    auth_id, auth_dt, final_amt = a[0], a[3], a[4]
    settle = (auth_dt + timedelta(days=random.randint(1, 3))).date()
    clearing.append([
        idx, auth_id, settle, final_amt,
        round(final_amt * 0.012, 2), round(final_amt * 0.003, 2),
        auth_dt + timedelta(days=random.randint(1, 3)),
    ])
emit("processing", "clearing", "proc",
     ["clearing_id", "auth_id", "settlement_date", "final_amount",
      "interchange_fee", "scheme_fee", "updated_at"],
     clearing)


# ---------------------------------------------------------------------------
# Сводка
# ---------------------------------------------------------------------------
totals = {
    "crm.customers":                   len(customers),
    "crm.customer_contacts":           len(customer_contacts),
    "crm.customer_segments_history":   len(segments_history),
    "core_banking.branches":           len(branches),
    "core_banking.accounts":           len(accounts),
    "core_banking.daily_turnovers":    len(turnovers),
    "card_system.merchants":           len(merchants),
    "card_system.cards":               len(cards),
    "card_system.card_blocks":         len(card_blocks),
    "mobile_app.devices":              len(devices),
    "mobile_app.sessions":             len(sessions),
    "mobile_app.events":               len(events),
    "processing.transactions":         len(transactions),
    "processing.authorizations":       len(authorizations),
    "processing.clearing":             len(clearing),
}
print("\n=================== ИТОГ ===================")
total = 0
per_source = {}
for k, v in totals.items():
    src = k.split(".", 1)[0]
    per_source[src] = per_source.get(src, 0) + v
    print(f"  {k:38s}  {v:>7d}")
    total += v

print()
for src, n in per_source.items():
    print(f"  Источник {src:18s}  всего: {n:>7d}")
print(f"\n  TOTAL по всем 5 источникам:  {total:>7d}")
print(f"\nFiles written to: {OUT_DIR}")
