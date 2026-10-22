"""Generate a fully local review page for an experimental run (no server required)."""
import argparse
import json
from pathlib import Path
from local_retouch import PRIVATE

def main():
    p=argparse.ArgumentParser();p.add_argument('--run',required=True);a=p.parse_args()
    if Path(a.run).name!=a.run:raise ValueError('Invalid run')
    out=PRIVATE/a.run
    reports=json.loads((out/'report.json').read_text())
    options=''.join(f'<option>{r["id"]}</option>' for r in reports)
    html='''<!doctype html><html lang="ko"><meta charset="utf-8"><title>notoow — 로컬 보정 실험</title>
<style>*{box-sizing:border-box}body{margin:0;background:#191d20;color:#eee;font:16px system-ui}header{padding:20px 24px;background:#252b30;position:sticky;top:0;z-index:2}h1{font-size:22px;margin:0 0 8px}p{margin:8px 0;color:#c5ccd1}select,button{padding:10px;border-radius:6px;border:1px solid #777;background:#30383f;color:white;margin-right:8px}main{padding:20px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}img{width:100%;display:block}figcaption{padding:10px 0}#overlay{display:none}pre{white-space:pre-wrap}a{color:#ff9a75}.warning{color:#ffc09e}</style>
<header><h1>notoow · 로컬 자동 보정 실험</h1><p class="warning">개발용 결과 — 공개·임상 사용 승인 아님. 유두·가슴선 보존 및 제거 누락을 별도로 검증 중입니다.</p>
<select id="case">OPTIONS</select><button id="toggle">수정 영역 보기</button><button id="zoom">100% 크기</button><p>왼쪽 원본 / 오른쪽 자동 보정 · 원본 파일 변경 없음 · 외부 통신 없음</p></header>
<main><div class="pair" id="pair"><figure><figcaption>원본</figcaption><img id="original"></figure><figure><figcaption>자동 보정 실험본</figcaption><img id="result"></figure></div><img id="overlay"><h2>자동 검증 기록</h2><p>보호 마스크 내부 변경 0은 해당 마스크를 지켰다는 뜻이며, 모든 해부학적 부위를 정확히 검출했다는 의미는 아닙니다.</p><pre id="metrics"></pre></main>
<script>const reports=REPORTS;const sel=document.getElementById('case');function show(){const id=sel.value;document.getElementById('original').src=id+'/original.png';document.getElementById('result').src=id+'/retouched.png';document.getElementById('overlay').src=id+'/comparison.jpg';document.getElementById('metrics').textContent=JSON.stringify(reports.find(x=>x.id===id),null,2)}sel.onchange=show;document.getElementById('toggle').onclick=()=>{let e=document.getElementById('overlay');e.style.display=e.style.display==='block'?'none':'block'};document.getElementById('zoom').onclick=()=>{let p=document.getElementById('pair');p.style.gridTemplateColumns=p.style.gridTemplateColumns?'':'max-content max-content';for(const im of p.querySelectorAll('img'))im.style.width=im.style.width==='auto'?'100%':'auto'};show();</script></html>'''
    (out/'index.html').write_text(html.replace('OPTIONS',options).replace('REPORTS',json.dumps(reports)),encoding='utf-8')
    print(out/'index.html')

if __name__=='__main__':main()
