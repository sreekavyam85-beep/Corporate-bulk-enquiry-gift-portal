from db import execute_query
import json
from datetime import datetime

class Encoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)

res = execute_query('SELECT * FROM design_approvals')
print(json.dumps(res, cls=Encoder, indent=2))
