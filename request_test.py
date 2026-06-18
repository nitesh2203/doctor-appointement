import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError

url = 'http://localhost:5000/api/debug'
headers = {'Content-Type': 'application/json'}
data = json.dumps({'doctor_code':'d1','patient_id':5,'appointment_date':'2026-06-06','appointment_time':'11:00','reason':'Checkup','symptoms':'None'}).encode('utf-8')
req = Request(url, data=data, headers=headers, method='POST')
try:
    with urlopen(req) as resp:
        print(resp.status)
        print(resp.read().decode())
except HTTPError as e:
    print('HTTP',e.code)
    print(e.read().decode())
