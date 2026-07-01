import sqlite3
c = sqlite3.connect('datavault_dev.db').cursor()
c.execute("SELECT email FROM users")
print(c.fetchall())
