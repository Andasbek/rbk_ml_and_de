"""
Генератор синтетических данных для 5 источников банковской системы.

5 источников (как 5 отдельных PG-БД):
  1) bank_core   — клиенты, счета, отделения, транзакции (АБС)
  2) bank_cards  — карты, мерчанты, авторизации, клиринг
  3) bank_credit — кредитные заявки, договоры, графики платежей
  4) bank_dbo    — устройства, сессии, события (моб.банк)
  5) bank_aml    — мониторинг транзакций, алерты, правила

ВСЕ источники связаны общим customer_id, плюс есть кросс-связи:
  - bank_cards.cards.account_id    → bank_core.accounts.account_id
  - bank_aml.monitored_txs.trx_id  → bank_core.transactions.trx_id

Скрипт делает две вещи:
  A) Пишет CSV в ./data/<source>/<table>.csv  (для проверки и Excel)
  B) Пишет INSERT-скрипты в ./data/<source>/load_<table>.sql
     (можно прогнать через `psql -f load_*.sql`)

Запуск:
  pip install faker
  python generate_data.py
"""

import csv
import hashlib
import os
import random
import string
from datetime import datetime, timedelta
from pathlib import Path

from faker import Faker

# ---------------------------------------------------------------------------
# Конфиг — сколько генерим
# ---------------------------------------------------------------------------
SEED = 42
N_BRANCHES        = 10
N_CUSTOMERS       = 1000
N_ACCOUNTS        = 1500
N_TRANSACTIONS    = 12000

N_MERCHANTS       = 100
N_CARDS           = 1200
N_AUTHORIZATIONS  = 5000
# клиринг = подмножество авторизаций со статусом 'approved'

N_LOAN_APPS       = 1500
# договоры и графики — производные

N_DEVICES         = 1200
N_SESSIONS        = 2000
N_EVENTS          = 6000

N_RISK_RULES      = 15
N_MONITORED       = 2000
# алерты — производные

OUT_DIR = Path(__file__).resolve().parent.parent / "data"

# ---------------------------------------------------------------------------
# Утилиты
# ---------------------------------------------------------------------------
random.seed(SEED)
fake = Faker("ru_RU")
Faker.seed(SEED)

CITIES = [
    "Almaty", "Astana", "Shymkent", "Karaganda", "Aktobe",
    "Taraz", "Pavlodar", "Oskemen", "Semey", "Atyrau",
]
SEGMENTS = ["mass", "mass", "mass", "mass", "premium", "premium", "wealth"]
ACCOUNT_TYPES = ["current", "current", "current", "savings", "deposit"]
CARD_PRODUCTS = ["classic", "classic", "classic", "gold", "gold", "platinum"]
PURPOSES = ["mortgage", "car", "consumer", "consumer", "consumer", "education"]
LOAN_STATUSES = ["active", "active", "active", "paid", "default", "restructured"]
APP_STATUSES = ["approved", "approved", "approved", "rejected", "in_review", "new"]
DEVICE_TYPES = ["ios", "android", "android", "android", "web"]
EVENT_TYPES = [
    "login", "view_balance", "make_transfer", "pay_utility",
    "open_card", "view_history", "logout", "change_password",
]
AUTH_METHODS = ["password", "biometric", "biometric", "otp"]
CHANNELS = ["atm", "pos", "online", "branch"]


def pan_hash(card_num: str) -> str:
    return hashlib.sha256(card_num.encode()).hexdigest()


def random_dt(days_back: int = 365) -> datetime:
    end = datetime(2025, 12, 31)
    return end - timedelta(
        days=random.randint(0, days_back),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
        seconds=random.randint(0, 59),
    )


def iin() -> str:
    return "".join(random.choices(string.digits, k=12))


def acct_number() -> str:
    return "KZ" + "".join(random.choices(string.digits, k=18))


def write_csv(source: str, table: str, header: list, rows: list):
    folder = OUT_DIR / source
    folder.mkdir(parents=True, exist_ok=True)
    fpath = folder / f"{table}.csv"
    with open(fpath, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        w.writerow(header)
        w.writerows(rows)
    print(f"  CSV  {fpath.relative_to(OUT_DIR.parent)}  rows={len(rows)}")


def write_sql(source: str, table: str, schema: str, header: list, rows: list):
    folder = OUT_DIR / source
    folder.mkdir(parents=True, exist_ok=True)
    fpath = folder / f"load_{table}.sql"
    cols = ",".join(header)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(f"-- INSERTs для {schema}.{table}\n")
        f.write(f"SET search_path TO {schema};\n")
        f.write(f"TRUNCATE {table} RESTART IDENTITY CASCADE;\n")
        batch = 500
        for i in range(0, len(rows), batch):
            chunk = rows[i:i + batch]
            f.write(f"INSERT INTO {table}({cols}) VALUES\n")
            vals = []
            for r in chunk:
                vals.append("(" + ",".join(_sql_lit(v) for v in r) + ")")
            f.write(",\n".join(vals))
            f.write(";\n")
    print(f"  SQL  {fpath.relative_to(OUT_DIR.parent)}")


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


def emit(source: str, table: str, schema: str, header: list, rows: list):
    write_csv(source, table, header, rows)
    write_sql(source, table, schema, header, rows)


# ---------------------------------------------------------------------------
# SOURCE 1: bank_core
# ---------------------------------------------------------------------------
print("\n== Source 1: bank_core (АБС) ==")

branches = []
for i in range(1, N_BRANCHES + 1):
    city = random.choice(CITIES)
    branches.append([
        i,                                 # branch_id
        f"BR{str(i).zfill(4)}",            # branch_code
        f"{city} филиал {i}",              # branch_name
        city,
        fake.street_address(),
        (datetime(2010, 1, 1) + timedelta(days=random.randint(0, 4000))).date(),
        True,
    ])
emit("bank_core", "branches", "core",
     ["branch_id", "branch_code", "branch_name", "city", "address", "opened_date", "is_active"],
     branches)

customers = []
for i in range(1, N_CUSTOMERS + 1):
    gender = random.choice(["M", "F"])
    first = fake.first_name_male() if gender == "M" else fake.first_name_female()
    last = fake.last_name_male() if gender == "M" else fake.last_name_female()
    reg_dt = random_dt(days_back=1000)
    customers.append([
        i,
        first,
        last,
        iin(),
        (datetime(1960, 1, 1) + timedelta(days=random.randint(0, 60 * 365))).date(),
        gender,
        fake.phone_number()[:20],
        f"{first.lower()}.{last.lower()}{i}@example.kz",
        random.choice(CITIES),
        random.randint(1, N_BRANCHES),
        random.choice(SEGMENTS),
        reg_dt,
        reg_dt + timedelta(days=random.randint(0, 200)),
    ])
emit("bank_core", "customers", "core",
     ["customer_id", "first_name", "last_name", "iin", "birth_date", "gender",
      "phone", "email", "city", "branch_id", "segment", "registered_at", "updated_at"],
     customers)

# каждому клиенту — 1..2 счёта (всего N_ACCOUNTS)
accounts = []
cust_to_accounts: dict[int, list[int]] = {}
for i in range(1, N_ACCOUNTS + 1):
    cust = random.randint(1, N_CUSTOMERS)
    opened = random_dt(days_back=900)
    accounts.append([
        i,
        acct_number(),
        cust,
        random.choice(ACCOUNT_TYPES),
        "KZT",
        round(random.uniform(0, 5_000_000), 2),
        opened,
        None,
        "active",
        opened + timedelta(days=random.randint(0, 200)),
    ])
    cust_to_accounts.setdefault(cust, []).append(i)
emit("bank_core", "accounts", "core",
     ["account_id", "account_number", "customer_id", "account_type", "currency",
      "balance", "opened_at", "closed_at", "status", "updated_at"],
     accounts)

# транзакции
transactions = []
for i in range(1, N_TRANSACTIONS + 1):
    acc = random.randint(1, N_ACCOUNTS)
    br = random.randint(1, N_BRANCHES)
    ttype = random.choice(["debit", "credit", "credit", "transfer"])
    amount = round(random.uniform(100, 500_000), 2)
    if random.random() < 0.01:                  # ~1% — крупные подозрительные
        amount = round(random.uniform(2_000_000, 20_000_000), 2)
    dt = random_dt(days_back=180)
    transactions.append([
        i,
        acc,
        br,
        dt,
        ttype,
        amount,
        "KZT",
        fake.sentence(nb_words=4)[:200],
        fake.company()[:100],
        dt.date(),
        dt,
    ])
emit("bank_core", "transactions", "core",
     ["trx_id", "account_id", "branch_id", "trx_datetime", "trx_type", "amount",
      "currency", "description", "counterparty", "posting_date", "updated_at"],
     transactions)

# ---------------------------------------------------------------------------
# SOURCE 2: bank_cards
# ---------------------------------------------------------------------------
print("\n== Source 2: bank_cards ==")

merchants = []
mcc_map = [
    ("5411", "grocery"), ("5541", "fuel"), ("5812", "restaurant"),
    ("5912", "pharmacy"), ("5732", "electronics"), ("7995", "gambling"),
    ("4111", "transport"), ("4900", "utility"), ("5999", "other"),
]
for i in range(1, N_MERCHANTS + 1):
    mcc, cat = random.choice(mcc_map)
    merchants.append([
        i,
        fake.company()[:100],
        mcc,
        cat,
        random.choice(CITIES),
        "KZ",
    ])
emit("bank_cards", "merchants", "cards",
     ["merchant_id", "merchant_name", "mcc", "category", "city", "country"],
     merchants)

cards = []
# карта привязана к существующему клиенту+счёту
account_pool = [(a[0], a[2]) for a in accounts]   # (account_id, customer_id)
random.shuffle(account_pool)
for i in range(1, N_CARDS + 1):
    acc_id, cust_id = random.choice(account_pool)
    issue = random_dt(days_back=700)
    cards.append([
        i,
        cust_id,
        acc_id,
        pan_hash(str(i) + str(cust_id) + str(random.random())),
        random.choice(CARD_PRODUCTS),
        (issue + timedelta(days=365 * 3)).date(),
        issue.date(),
        random.choices(["active", "blocked", "expired"], weights=[90, 5, 5])[0],
        f"{fake.first_name()[:1]} {fake.last_name()[:20]}".upper(),
        issue + timedelta(days=random.randint(0, 100)),
    ])
emit("bank_cards", "cards", "cards",
     ["card_id", "customer_id", "account_id", "card_pan_hash", "card_product",
      "expiry_date", "issue_date", "card_status", "embossed_name", "updated_at"],
     cards)

# авторизации
authorizations = []
auth_id_seq = 0
for _ in range(N_AUTHORIZATIONS):
    auth_id_seq += 1
    card_id = random.randint(1, N_CARDS)
    merch_id = random.randint(1, N_MERCHANTS)
    dt = random_dt(days_back=180)
    is_approved = random.random() > 0.07
    authorizations.append([
        auth_id_seq,
        card_id,
        merch_id,
        dt,
        round(random.uniform(50, 80_000), 2),
        "KZT",
        "".join(random.choices(string.digits, k=6)),
        "approved" if is_approved else "declined",
        None if is_approved else random.choice(["insufficient_funds", "card_blocked", "limit_exceeded"]),
        True,
    ])
emit("bank_cards", "authorizations", "cards",
     ["auth_id", "card_id", "merchant_id", "auth_datetime", "amount", "currency",
      "auth_code", "auth_result", "decline_reason", "is_online"],
     authorizations)

# клиринг: примерно 80% одобренных авторизаций
clearing = []
approved = [a for a in authorizations if a[7] == "approved"]
random.shuffle(approved)
clearing_sample = approved[: int(len(approved) * 0.8)]
for idx, a in enumerate(clearing_sample, start=1):
    auth_id = a[0]
    auth_dt = a[3]
    final_amt = a[4]
    settle = (auth_dt + timedelta(days=random.randint(1, 3))).date()
    clearing.append([
        idx,
        auth_id,
        settle,
        final_amt,
        round(final_amt * 0.012, 2),
        round(final_amt * 0.003, 2),
        auth_dt + timedelta(days=random.randint(1, 3)),
    ])
emit("bank_cards", "clearing", "cards",
     ["clearing_id", "auth_id", "settlement_date", "final_amount",
      "interchange_fee", "scheme_fee", "updated_at"],
     clearing)

# ---------------------------------------------------------------------------
# SOURCE 3: bank_credit
# ---------------------------------------------------------------------------
print("\n== Source 3: bank_credit ==")

loan_apps = []
for i in range(1, N_LOAN_APPS + 1):
    cust = random.randint(1, N_CUSTOMERS)
    app_dt = random_dt(days_back=540).date()
    status = random.choice(APP_STATUSES)
    decision = app_dt + timedelta(days=random.randint(0, 14)) if status != "new" else None
    loan_apps.append([
        i,
        cust,
        app_dt,
        round(random.uniform(100_000, 30_000_000), 2),
        random.choice([12, 24, 36, 60, 84, 120]),
        random.choice(PURPOSES),
        round(random.uniform(150_000, 1_500_000), 2),
        random.randint(0, 30),
        random.randint(400, 850),
        status,
        decision,
        random.choice(["A", "B", "C", "D"]),
    ])
emit("bank_credit", "loan_applications", "credit",
     ["application_id", "customer_id", "application_dt", "requested_amount",
      "requested_term_m", "purpose", "income_declared", "employment_years",
      "credit_score", "status", "decision_dt", "risk_grade"],
     loan_apps)

# договоры: только по approved-заявкам
loan_agreements = []
payment_schedule = []
loan_id_seq = 0
sched_id_seq = 0
for app in loan_apps:
    if app[9] != "approved":
        continue
    loan_id_seq += 1
    app_id = app[0]
    amount = round(app[3] * random.uniform(0.7, 1.0), 2)
    rate = round(random.uniform(8, 28), 2)
    eff = round(rate + random.uniform(0.5, 4), 2)
    disburse = app[10] + timedelta(days=random.randint(1, 7))
    term_m = app[4]
    maturity = disburse + timedelta(days=term_m * 30)
    status = random.choice(LOAN_STATUSES)
    loan_agreements.append([
        loan_id_seq,
        app_id,
        amount,
        rate,
        eff,
        disburse,
        maturity,
        status,
    ])
    # график: до min(term_m, 24) платежей
    payments_n = min(term_m, 24)
    monthly = round(amount * (1 + rate / 100) / payments_n, 2)
    for k in range(1, payments_n + 1):
        sched_id_seq += 1
        due = disburse + timedelta(days=30 * k)
        principal = round(monthly * 0.85, 2)
        interest = round(monthly * 0.15, 2)
        paid_on = due + timedelta(days=random.randint(-2, 10)) if random.random() > 0.15 else None
        paid_amt = monthly if paid_on else 0
        overdue = max(0, (paid_on - due).days) if paid_on else random.randint(0, 30)
        payment_schedule.append([
            sched_id_seq,
            loan_id_seq,
            due,
            principal,
            interest,
            monthly,
            paid_on,
            paid_amt,
            overdue,
        ])
emit("bank_credit", "loan_agreements", "credit",
     ["loan_id", "application_id", "approved_amount", "interest_rate",
      "effective_rate", "disbursement_date", "maturity_date", "loan_status"],
     loan_agreements)
emit("bank_credit", "payment_schedule", "credit",
     ["schedule_id", "loan_id", "due_date", "principal_due", "interest_due",
      "total_due", "actual_payment_dt", "actual_paid", "overdue_days"],
     payment_schedule)

# ---------------------------------------------------------------------------
# SOURCE 4: bank_dbo
# ---------------------------------------------------------------------------
print("\n== Source 4: bank_dbo ==")

devices = []
for i in range(1, N_DEVICES + 1):
    cust = random.randint(1, N_CUSTOMERS)
    dt = random_dt(days_back=600)
    devices.append([
        i,
        cust,
        random.choice(DEVICE_TYPES),
        f"{random.randint(10,18)}.{random.randint(0,5)}",
        f"{random.randint(3,7)}.{random.randint(0,20)}.{random.randint(0,9)}",
        "".join(random.choices(string.hexdigits.lower(), k=64))[:64],
        random.random() > 0.1,
        dt,
        dt + timedelta(days=random.randint(0, 200)),
    ])
emit("bank_dbo", "devices", "dbo",
     ["device_id", "customer_id", "device_type", "os_version", "app_version",
      "push_token", "is_trusted", "first_seen_at", "last_seen_at"],
     devices)

sessions = []
session_ids = []
for i in range(1, N_SESSIONS + 1):
    cust = random.randint(1, N_CUSTOMERS)
    # для этого клиента возьмём одно из его устройств (или случайное, если у него нет)
    dev_pool = [d[0] for d in devices if d[1] == cust]
    device_id = random.choice(dev_pool) if dev_pool else random.randint(1, N_DEVICES)
    login = random_dt(days_back=120)
    logout = login + timedelta(minutes=random.randint(1, 60))
    sid = "".join(random.choices(string.hexdigits.lower(), k=32))
    sessions.append([
        sid,
        cust,
        device_id,
        login,
        logout,
        fake.ipv4(),
        random.choice(CITIES),
        random.random() > 0.03,
        random.choice(AUTH_METHODS),
    ])
    session_ids.append(sid)
emit("bank_dbo", "sessions", "dbo",
     ["session_id", "customer_id", "device_id", "login_time", "logout_time",
      "ip_address", "city", "is_successful", "auth_method"],
     sessions)

events = []
for i in range(1, N_EVENTS + 1):
    sid = random.choice(session_ids)
    sess = next(s for s in sessions if s[0] == sid)
    ev_time = sess[3] + timedelta(seconds=random.randint(0, 1800))
    et = random.choice(EVENT_TYPES)
    amount = round(random.uniform(100, 200_000), 2) if et in ("make_transfer", "pay_utility") else None
    ok = random.random() > 0.05
    events.append([
        i,
        sid,
        ev_time,
        et,
        amount,
        acct_number() if amount else None,
        ok,
        None if ok else random.choice(["timeout", "validation_failed", "auth_error"]),
    ])
emit("bank_dbo", "events", "dbo",
     ["event_id", "session_id", "event_time", "event_type", "amount",
      "target_account", "is_successful", "error_message"],
     events)

# ---------------------------------------------------------------------------
# SOURCE 5: bank_aml
# ---------------------------------------------------------------------------
print("\n== Source 5: bank_aml ==")

risk_rules = [
    [1,  "RULE_LARGE_AMT",     "Крупная сумма (>10М тг)",          "high",   "Транзакция выше 10 000 000 KZT", True],
    [2,  "RULE_RAPID_MOVEMENT","Серия быстрых переводов",          "medium", "≥5 транзакций за 10 минут",      True],
    [3,  "RULE_HIGH_RISK_CTR", "Контрагент в high-risk стране",    "high",   "Перевод в санкционные юрисдикции", True],
    [4,  "RULE_NIGHT_HOURS",   "Транзакции ночью",                 "low",    "Между 00:00 и 05:00",            True],
    [5,  "RULE_NEW_CUST_BIG",  "Крупная сумма у нового клиента",   "high",   "Клиент <30 дней + сумма >1М",    True],
    [6,  "RULE_GAMBLING",      "MCC 7995 (gambling)",              "medium", "Авторизация в gambling-категории", True],
    [7,  "RULE_ATM_BURST",     "Серия снятий в банкомате",         "medium", "≥3 ATM снятия за час",            True],
    [8,  "RULE_DORMANT_WAKE",  "Пробуждение спящего счёта",        "medium", "Счёт без операций >180 дней",     True],
    [9,  "RULE_ROUND_AMT",     "Подозрительно круглая сумма",      "low",    "Сумма кратна 100 000",            True],
    [10, "RULE_SAME_DEV_MULTI","Одно устройство — много клиентов", "high",   "≥3 customer_id на одном device",  True],
    [11, "RULE_FAILED_LOGIN",  "Серия неудачных входов",           "medium", "≥5 fail логинов за 10 минут",     True],
    [12, "RULE_VELOCITY",      "Высокая скорость по карте",        "high",   "Авторизации в разных городах <1ч", True],
    [13, "RULE_STRUCTURING",   "Структурирование",                 "high",   "Дробление крупной суммы",         True],
    [14, "RULE_PEP",           "Politically Exposed Person",       "high",   "Клиент в PEP-списке",             True],
    [15, "RULE_FOREIGN_FX",    "Подозрительный FX",                "medium", "Конверсия >50К USD/день",         True],
]
emit("bank_aml", "risk_rules", "aml",
     ["rule_id", "rule_code", "rule_name", "severity", "description", "is_active"],
     risk_rules)

# мониторим часть транзакций из bank_core (берём из памяти, не из CSV)
monitored = []
# берём 2000 случайных транзакций
sample_tx = random.sample(transactions, N_MONITORED)
for idx, t in enumerate(sample_tx, start=1):
    trx_id = t[0]
    acc_id = t[1]
    amount = t[5]
    dt = t[3]
    # customer_id — найти по account
    cust_id = next(a[2] for a in accounts if a[0] == acc_id)

    rules_triggered = []
    score = random.uniform(5, 30)
    if amount > 10_000_000:
        rules_triggered.append("RULE_LARGE_AMT")
        score += 40
    if dt.hour < 5:
        rules_triggered.append("RULE_NIGHT_HOURS")
        score += 10
    if amount % 100_000 == 0 and amount >= 500_000:
        rules_triggered.append("RULE_ROUND_AMT")
        score += 5
    if random.random() < 0.03:
        rules_triggered.append("RULE_HIGH_RISK_CTR")
        score += 30

    flagged = len(rules_triggered) >= 2 or amount > 10_000_000
    monitored.append([
        idx,
        trx_id,
        cust_id,
        dt,
        amount,
        "KZT",
        random.choice(CHANNELS),
        round(min(score, 100), 2),
        flagged,
        ",".join(rules_triggered) or None,
        dt + timedelta(minutes=random.randint(0, 60)),
    ])
emit("bank_aml", "monitored_txs", "aml",
     ["monitor_id", "trx_id", "customer_id", "trx_datetime", "amount", "currency",
      "channel", "risk_score", "is_flagged", "triggered_rules", "created_at"],
     monitored)

aml_alerts = []
alert_id_seq = 0
officers = ["A.Ivanov", "S.Smirnova", "K.Auelbek", "D.Bekov", "R.Mukan"]
rule_map = {r[1]: r[0] for r in risk_rules}
for m in monitored:
    if not m[8]:                       # не flagged
        continue
    for r_code in (m[9] or "").split(","):
        if not r_code:
            continue
        alert_id_seq += 1
        rule_id = rule_map.get(r_code)
        sev = next(rr[3] for rr in risk_rules if rr[0] == rule_id)
        status = random.choices(
            ["open", "closed_SAR_filed", "false_positive"],
            weights=[50, 20, 30],
        )[0]
        aml_alerts.append([
            alert_id_seq,
            m[0],
            rule_id,
            m[3] + timedelta(minutes=random.randint(1, 30)),
            sev,
            random.choice(officers),
            status,
            status == "closed_SAR_filed",
            None if status == "open" else m[3] + timedelta(days=random.randint(1, 14)),
        ])
emit("bank_aml", "aml_alerts", "aml",
     ["alert_id", "monitor_id", "rule_id", "alert_datetime", "severity",
      "assigned_officer", "status", "sar_filed", "closed_at"],
     aml_alerts)

# ---------------------------------------------------------------------------
# Сводка
# ---------------------------------------------------------------------------
totals = {
    "bank_core.branches":       len(branches),
    "bank_core.customers":      len(customers),
    "bank_core.accounts":       len(accounts),
    "bank_core.transactions":   len(transactions),
    "bank_cards.merchants":     len(merchants),
    "bank_cards.cards":         len(cards),
    "bank_cards.authorizations":len(authorizations),
    "bank_cards.clearing":      len(clearing),
    "bank_credit.loan_applications": len(loan_apps),
    "bank_credit.loan_agreements":   len(loan_agreements),
    "bank_credit.payment_schedule":  len(payment_schedule),
    "bank_dbo.devices":         len(devices),
    "bank_dbo.sessions":        len(sessions),
    "bank_dbo.events":          len(events),
    "bank_aml.risk_rules":      len(risk_rules),
    "bank_aml.monitored_txs":   len(monitored),
    "bank_aml.aml_alerts":      len(aml_alerts),
}
print("\n========== ИТОГ ==========")
total = 0
for k, v in totals.items():
    print(f"  {k:35s}  {v:>7d}")
    total += v
print(f"  {'TOTAL':35s}  {total:>7d}")
print(f"\nAll files written to: {OUT_DIR}")
