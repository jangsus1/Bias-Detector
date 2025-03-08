import sqlite3
from collections import defaultdict

class DatabaseConnector:
    def __init__(
        self, 
        database_path: str,
        table_name: str,
    ):
        self.database = sqlite3.connect(database_path)
        self.table_name = table_name
    
    def get_all_user_data(self):
        cursor = self.database.cursor()

        # Run SQL to generate all the data
        cursor.execute(f'SELECT * FROM {self.table_name}')

        rows = cursor.fetchall()
        
        column_names = [desc[0] for desc in cursor.description]

        result = [dict(zip(column_names, row)) for row in rows]

        # Group result by user_id
        result_user_id_data = defaultdict(list)

        for item in result:
            result_user_id_data[item['user_id']].append(item)

        return result_user_id_data
    
    def get_user_data_by_uid(self, uid: str):
        cursor = self.database.cursor()

        # Run SQL to generate all the data
        cursor.execute(f'SELECT * FROM {self.table_name} WHERE user_id == {uid}')

        rows = cursor.fetchall()
        column_names = [desc[0] for desc in cursor.description]
        result = [dict(zip(column_names, row)) for row in rows]
        
        return result