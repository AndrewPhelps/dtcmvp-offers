#!/usr/bin/env python3
import json, os, re, sys

BATCH = sys.argv[1] if len(sys.argv) > 1 else '/tmp/swag-batch'
EMDASH = '—'
ENDASH = '–'

CANON = {
    'CVR Lift', 'AOV Lift', 'Repeat Rate Lift', 'LTV Lift', 'Cart Recovery',
    'Upsell Revenue', 'Subscription Revenue', 'Attributed Revenue',
    'Winback Revenue', 'Retention Revenue', 'List Growth Revenue',
    'Ad Revenue', 'Organic Revenue', 'Flow Optimization',
    'Ticket Deflection', 'Return Prevention', 'ROAS Improvement',
    'Fee Avoidance', 'Shipping Optimization', 'Tool Consolidation',
    'Workflow Automation'
}

CANON_CATS = {
    'Apparel & Fashion', 'Beauty & Cosmetics', 'Health & Wellness',
    'Sports & Fitness', 'Food & Drink', 'Home & Electronics',
    'Baby & Kids', 'Pet & Vet', 'Other'
}

CANON_DEPTS = {
    'Retention / CRM', 'Creative / Brand', 'Influencer / Affiliate',
    'Performance / Paid', 'SEO / Content', 'Ecommerce / DTC',
    'Marketing / Growth', 'Finance / Accounting', 'CX / Support',
    'Operations / Logistics', 'Data / Analytics', 'Sales / B2B',
    'Engineering / Technology', 'Product / UX', 'People / HR',
    'PR / Communications', 'Founder & CEO', 'Other C-Suite', 'Other'
}

AI_SPEAK = [
    r'\bleverag(e|ing|es|ed)\b', r'\brobust\b', r'\bseamless(ly)?\b',
    r'\bdelve\b', r'\bmoreover\b', r'\bfurthermore\b', r'\bcrucial\b',
    r'\bvital\b', r'\bunlocks?\b', r'\bempowers?\b', r'\bmeticulous(ly)?\b',
    r'\btapestry\b', r'\bcomprehensive\b', r'\bcutting-edge\b',
    r'\bstate-of-the-art\b', r'\butiliz(e|ing|es|ed)\b'
]

issues = {}
for fname in sorted(os.listdir(BATCH)):
    if not fname.endswith('.json'):
        continue
    path = os.path.join(BATCH, fname)
    text = open(path).read()
    try:
        d = json.loads(text)
    except json.JSONDecodeError as e:
        issues[fname] = {'json_error': str(e)}
        continue

    file_issues = {}

    bad_labels = []
    bad_paren = []
    for b in d.get('benefits', []):
        label = b.get('label', '')
        base = label.split(' (')[0]
        if base not in CANON:
            bad_labels.append(label)
        if '(' in label and not label.startswith('Attributed Revenue'):
            bad_paren.append(label)
    if bad_labels:
        file_issues['bad_labels'] = bad_labels
    if bad_paren:
        file_issues['bad_paren'] = bad_paren

    nar = d.get('narrative', {})
    bad_cats = [c for c in nar.get('byCategory', {}).keys() if c not in CANON_CATS]
    if bad_cats:
        file_issues['bad_categories'] = bad_cats
    bad_depts = [d2 for d2 in nar.get('byDepartment', {}).keys() if d2 not in CANON_DEPTS]
    if bad_depts:
        file_issues['bad_departments'] = bad_depts

    if not nar:
        file_issues['missing_narrative'] = True
    else:
        if 'headline' not in nar:
            file_issues['missing_narrative_headline'] = True
        if 'Other' not in nar.get('byDepartment', {}):
            file_issues['missing_byDept_Other'] = True
        if 'Other' not in nar.get('byCategory', {}):
            file_issues['missing_byCat_Other'] = True

    em = text.count(EMDASH)
    en = text.count(ENDASH)
    dh = text.count('--')
    if em:
        file_issues['emdash'] = em
    if en:
        file_issues['endash'] = en
    if dh:
        file_issues['double_hyphen'] = dh

    ai_hits = {}
    for pattern in AI_SPEAK:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            ai_hits[pattern] = len(matches)
    if ai_hits:
        file_issues['ai_speak'] = ai_hits

    for b in d.get('benefits', []):
        for k, sd in b.get('swagDefaults', {}).items():
            if not sd.get('source'):
                file_issues.setdefault('missing_source', []).append(f"{b.get('id')}.{k}")

    if file_issues:
        issues[fname] = file_issues

count = len([f for f in os.listdir(BATCH) if f.endswith('.json')])
if not issues:
    print(f'CLEAN: {count} files pass lint.')
    sys.exit(0)
else:
    print('ISSUES FOUND:')
    for f, i in issues.items():
        print(f'\n  {f}:')
        for k, v in i.items():
            print(f'    {k}: {v}')
    print(f'\nFiles checked: {count}, with issues: {len(issues)}')
    sys.exit(1)
