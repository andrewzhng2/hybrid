"""Simple connectivity test for Snowflake credentials."""
from app.db.session import get_snowflake_connection


def main() -> None:
    connection = get_snowflake_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("select current_account(), current_warehouse(), current_role()")
        account, warehouse, role = cursor.fetchone()
        print("Connected to:", account)
        print("Warehouse:", warehouse)
        print("Role:", role)
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()



