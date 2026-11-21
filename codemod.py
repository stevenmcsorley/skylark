import re, sys, pathlib
root=pathlib.Path('src/ui'); changed=0
RULES=[]
def R(pat,rep): RULES.append((re.compile(pat),rep))
# accent: every primary action, link and focus ring uses the one accent
R(r'\b(focus:ring)-(?:blue|green|purple|yellow|indigo|emerald)-500\b', r'\1-accent-500')
R(r'\bring-blue-400\b','ring-accent-400')
R(r'\b(hover:)?bg-(?:blue|green|purple|yellow)-600\b', lambda m:(m.group(1) or '')+'bg-accent-600')
R(r'\bhover:bg-(?:blue|green|purple|yellow)-700\b','hover:bg-accent-700')
R(r'\b(hover:)?text-(?:blue|green)-(?:300|400|500)\b', lambda m:(m.group(1) or '')+'text-accent-400')
R(r'\bbg-(?:blue|green)-500\b','bg-accent-500')
R(r'\bbg-blue-400\b','bg-sky-500')
# tinted decorative panels become plain neutral surfaces; green tints stay as a quiet accent tint
R(r'\bbg-(?:blue|purple|violet|orange|indigo)-500/(?:10|20)\b','bg-slate-800/60')
R(r'\bborder-(?:blue|purple|violet|orange|indigo)-500/(?:30|60)\b','border-slate-700')
R(r'\bbg-blue-900/20\b','bg-slate-800/40')
R(r'\bhover:bg-(?:purple|indigo)-(?:500|600)/30\b','hover:bg-slate-700')
R(r'\bbg-green-500/(10|20)\b',r'bg-accent-500/\1')
R(r'\bborder-green-500/30\b','border-accent-500/30')
# decorative text colours become neutral; status keeps red / amber / sky
R(r'\btext-(?:purple|violet|indigo|pink|teal|cyan)-(?:300|400)\b','text-slate-300')
R(r'\btext-orange-(?:300|400)\b','text-slate-100')
R(r'\b(bg|text|border|hover:bg)-yellow-(\d+(?:/\d+)?)\b',lambda m:f'{m.group(1)}-amber-{m.group(2)}')
R(r'\bfocus:ring-yellow-500\b','focus:ring-accent-500')
# surfaces: one card radius, no glow / blur / heavy shadow
R(r'\brounded-xl\b','rounded-lg')
R(r'\b(?:shadow-2xl|shadow-xl|shadow-lg)\b','')
R(r'\bbackdrop-blur(?:-sm)?\b','')
# type: no heavy bold
R(r'\bfont-bold\b','font-semibold')
R(r'\btext-3xl font-semibold\b','text-xl font-semibold')
R(r'\bh1 \b','h1 ')
for f in root.rglob('*.tsx'):
    if '__tests__' in f.parts or '.test.' in f.name: continue
    s=f.read_text(); o=s
    for pat,rep in RULES: s=pat.sub(rep,s)
    s=re.sub(r'  +"',' "',s) if False else s
    s=re.sub(r'(className=(?:"|`))([^"`]*)',lambda m:m.group(1)+re.sub(r'  +',' ',m.group(2)).replace(' "','"'),s) if False else s
    if s!=o: f.write_text(s); changed+=1; print('changed',f)
print(changed,'files')
