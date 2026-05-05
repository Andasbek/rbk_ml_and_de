from __future__ import annotations

import random
from pathlib import Path
from datetime import datetime, timedelta

import pandas as pd
from faker import Faker


fake = Faker("ru_RU")
random.seed(42)
Faker.seed(42)


OUTPUT_DIR = Path("bank_sources_output")
OUTPUT_DIR.mkdir(exist_ok=True)


NUM_CLIENTS = 2000
NUM_ACCOUNTS = 3000
NUM_CARDS = 2500
NUM_SESSIONS = 12000
NUM_TRANSACTIONS = 30000


CITIES = [
    "Алматы",
    "Астана",
    "Шымкент",
    "Караганда",
    "Актобе",
    "Тараз",
    "Павлодар",
    "Усть-Каменогорск",
]

ACCOUNT_TYPES = ["debit", "savings", "credit"]
ACCOUNT_STATUSES = ["active", "active", "active", "blocked", "closed"]

CARD_TYPES = ["visa", "mastercard"]
CARD_LEVELS = ["classic", "gold", "platinum"]
CARD_STATUSES = ["active", "active", "active", "blocked", "expired"]

DEVICE_TYPES = ["ios", "android", "web"]
TRANSACTION_TYPES = ["purchase", "transfer", "cash_withdrawal", "deposit"]
TRANSACTION_STATUSES = ["success", "success", "success", "declined"]
CURRENCIES = ["KZT", "USD", "EUR"]

MERCHANT_NAMES = [
    "Magnum",
    "Kaspi Store",
    "Technodom",
    "Sulpak",
    "Small",
    "Coffee Boom",
    "KFC",
    "Burger King",
    "Zara",
    "H&M",
    "Air Astana",
    "Yandex Go",
    "Glovo",
    "Ramstore",
    "Green Bazaar",
]

MERCHANT_CATEGORIES = [
    "supermarket",
    "electronics",
    "restaurant",
    "clothing",
    "transport",
    "marketplace",
    "travel",
    "food_delivery",
]


def random_datetime_last_year() -> datetime:
    now = datetime.now()
    start = now - timedelta(days=365)
    delta_seconds = int((now - start).total_seconds())
    return start + timedelta(seconds=random.randint(0, delta_seconds))


def mask_card_number() -> str:
    first4 = str(random.randint(4000, 4999))
    last4 = str(random.randint(1000, 9999))
    return f"{first4}********{last4}"


def make_clients(num_clients: int) -> pd.DataFrame:
    rows = []
    for client_id in range(1, num_clients + 1):
        first_name = fake.first_name()
        last_name = fake.last_name()
        birth_date = fake.date_of_birth(minimum_age=18, maximum_age=75)
        registration_date = random_datetime_last_year()

        rows.append(
            {
                "client_id": client_id,
                "first_name": first_name,
                "last_name": last_name,
                "birth_date": birth_date.isoformat(),
                "phone": fake.phone_number(),
                "email": fake.email(),
                "city": random.choice(CITIES),
                "registration_date": registration_date.strftime("%Y-%m-%d %H:%M:%S"),
            }
        )

    return pd.DataFrame(rows)


def make_accounts(num_accounts: int, clients_df: pd.DataFrame) -> pd.DataFrame:
    client_ids = clients_df["client_id"].tolist()
    used_account_numbers: set[str] = set()
    rows = []

    for account_id in range(1, num_accounts + 1):
        account_number = fake.iban()
        while account_number in used_account_numbers:
            account_number = fake.iban()
        used_account_numbers.add(account_number)

        rows.append(
            {
                "account_id": account_id,
                "client_id": random.choice(client_ids),
                "account_number": account_number,
                "account_type": random.choice(ACCOUNT_TYPES),
                "currency": random.choice(CURRENCIES),
                "balance": round(random.uniform(1000, 5_000_000), 2),
                "status": random.choice(ACCOUNT_STATUSES),
                "opened_at": random_datetime_last_year().strftime("%Y-%m-%d %H:%M:%S"),
            }
        )

    return pd.DataFrame(rows)


def make_cards(num_cards: int, accounts_df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    sampled_accounts = accounts_df.sample(
        n=min(num_cards, len(accounts_df)),
        replace=False,
        random_state=42,
    )

    for card_id, (_, account_row) in enumerate(sampled_accounts.iterrows(), start=1):
        issue_date = fake.date_between(start_date="-3y", end_date="today")
        expiry_date = issue_date + timedelta(days=365 * 3)

        rows.append(
            {
                "card_id": card_id,
                "client_id": int(account_row["client_id"]),
                "account_id": int(account_row["account_id"]),
                "card_number_masked": mask_card_number(),
                "card_type": random.choice(CARD_TYPES),
                "card_level": random.choice(CARD_LEVELS),
                "issue_date": issue_date.isoformat(),
                "expiry_date": expiry_date.isoformat(),
                "card_status": random.choice(CARD_STATUSES),
            }
        )

    return pd.DataFrame(rows)


def make_mobile_sessions(num_sessions: int, clients_df: pd.DataFrame) -> pd.DataFrame:
    client_ids = clients_df["client_id"].tolist()
    rows = []

    for session_num in range(1, num_sessions + 1):
        login_time = random_datetime_last_year()
        logout_time = login_time + timedelta(minutes=random.randint(1, 180))

        rows.append(
            {
                "session_id": f"session_{session_num}",
                "client_id": random.choice(client_ids),
                "login_time": login_time.strftime("%Y-%m-%d %H:%M:%S"),
                "logout_time": logout_time.strftime("%Y-%m-%d %H:%M:%S"),
                "device_type": random.choice(DEVICE_TYPES),
                "app_version": f"{random.randint(1, 5)}.{random.randint(0, 9)}.{random.randint(0, 9)}",
                "ip_address": fake.ipv4_public(),
            }
        )

    return pd.DataFrame(rows)


def make_transactions(num_transactions: int, cards_df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    cards_records = cards_df.to_dict(orient="records")

    for transaction_id in range(1, num_transactions + 1):
        selected_card = random.choice(cards_records)

        rows.append(
            {
                "transaction_id": transaction_id,
                "client_id": int(selected_card["client_id"]),
                "account_id": int(selected_card["account_id"]),
                "card_id": int(selected_card["card_id"]),
                "transaction_time": random_datetime_last_year().strftime("%Y-%m-%d %H:%M:%S"),
                "amount": round(random.uniform(500, 500_000), 2),
                "currency": random.choice(CURRENCIES),
                "transaction_type": random.choice(TRANSACTION_TYPES),
                "merchant_name": random.choice(MERCHANT_NAMES),
                "merchant_category": random.choice(MERCHANT_CATEGORIES),
                "city": random.choice(CITIES),
                "status": random.choice(TRANSACTION_STATUSES),
            }
        )

    return pd.DataFrame(rows)


def save_to_csv(dataframes: dict[str, pd.DataFrame], output_dir: Path) -> None:
    for name, df in dataframes.items():
        file_path = output_dir / f"{name}.csv"
        df.to_csv(file_path, index=False, encoding="utf-8-sig")


def save_to_excel(dataframes: dict[str, pd.DataFrame], output_dir: Path) -> None:
    excel_path = output_dir / "bank_sources.xlsx"
    with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
        for name, df in dataframes.items():
            df.to_excel(writer, sheet_name=name, index=False)


def print_summary(dataframes: dict[str, pd.DataFrame]) -> None:
    print("\nСгенерированные источники:")
    total_rows = 0
    for name, df in dataframes.items():
        count = len(df)
        total_rows += count
        print(f"{name}: {count} записей")

    print(f"\nОбщее количество записей: {total_rows}")


def validate_relationships(
    clients_df: pd.DataFrame,
    accounts_df: pd.DataFrame,
    cards_df: pd.DataFrame,
    sessions_df: pd.DataFrame,
    transactions_df: pd.DataFrame,
) -> None:
    client_ids = set(clients_df["client_id"])
    account_ids = set(accounts_df["account_id"])
    card_ids = set(cards_df["card_id"])

    assert set(accounts_df["client_id"]).issubset(client_ids), "Ошибка связи accounts -> clients"
    assert set(cards_df["client_id"]).issubset(client_ids), "Ошибка связи cards -> clients"
    assert set(cards_df["account_id"]).issubset(account_ids), "Ошибка связи cards -> accounts"
    assert set(sessions_df["client_id"]).issubset(client_ids), "Ошибка связи mobile_sessions -> clients"
    assert set(transactions_df["client_id"]).issubset(client_ids), "Ошибка связи transactions -> clients"
    assert set(transactions_df["account_id"]).issubset(account_ids), "Ошибка связи transactions -> accounts"
    assert set(transactions_df["card_id"]).issubset(card_ids), "Ошибка связи transactions -> cards"

    print("\nПроверка связей прошла успешно.")


def main() -> None:
    print("Генерация clients...")
    clients_df = make_clients(NUM_CLIENTS)

    print("Генерация accounts...")
    accounts_df = make_accounts(NUM_ACCOUNTS, clients_df)

    print("Генерация cards...")
    cards_df = make_cards(NUM_CARDS, accounts_df)

    print("Генерация mobile_sessions...")
    sessions_df = make_mobile_sessions(NUM_SESSIONS, clients_df)

    print("Генерация transactions...")
    transactions_df = make_transactions(NUM_TRANSACTIONS, cards_df)

    validate_relationships(
        clients_df=clients_df,
        accounts_df=accounts_df,
        cards_df=cards_df,
        sessions_df=sessions_df,
        transactions_df=transactions_df,
    )

    dataframes = {
        "clients": clients_df,
        "accounts": accounts_df,
        "cards": cards_df,
        "mobile_sessions": sessions_df,
        "transactions": transactions_df,
    }

    save_to_csv(dataframes, OUTPUT_DIR)
    save_to_excel(dataframes, OUTPUT_DIR)
    print_summary(dataframes)

    print(f"\nФайлы сохранены в папку: {OUTPUT_DIR.resolve()}")


if __name__ == "__main__":
    main()