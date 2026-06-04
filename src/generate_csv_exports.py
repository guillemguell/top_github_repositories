import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import os

# Instead of PWD, this file wil be run from the src folder, so we need to adjust the path to the data file accordingly
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(ROOT, "data", "top_github_repos_enriched_preprocessed.csv")
df = pd.read_csv(DATA_PATH)
df = df.dropna(subset=['primary_language','language_entropy','num_languages_total','total_content_size','binary_ratio'])
for col in ['file_rows','total_content_size','watch_count']:
    df[col] = df[col].clip(upper=df[col].quantile(0.99))
df['log_watch'] = np.log1p(df['watch_count'])
df['log_files'] = np.log1p(df['file_rows'])
df['log_size']  = np.log1p(df['total_content_size'])

features = ['log_files','avg_path_depth','log_size','binary_ratio','num_languages_total']
X = StandardScaler().fit_transform(df[features].fillna(0))
km = KMeans(n_clusters=4, random_state=42, n_init=15)
df['cluster_raw'] = km.fit_predict(X)
centers = pd.DataFrame(StandardScaler().fit(df[features].fillna(0)).inverse_transform(km.cluster_centers_), columns=features)
order = centers['log_files'].argsort().values
cmap = {order[0]:'Repositoris petits', order[1]:'Repositoris mitjans', order[2]:'Repositoris profunds', order[3]:'Repositoris grans'}
df['cluster'] = df['cluster_raw'].map(cmap)

def div_label(n):
    if n<=1: return 'Single'
    elif n==2: return 'Low (2)'
    elif n<=4: return 'Medium (3-4)'
    elif n<=10: return 'High (5-10)'
    else: return 'Polyglot (10+)'
df['div_level'] = df['num_languages_total'].apply(div_label)

top15 = df['primary_language'].value_counts().nlargest(15).index
df['lang'] = df['primary_language'].where(df['primary_language'].isin(top15), 'Other')
df['pop_tier'] = pd.qcut(df['watch_count'], q=4, labels=['Q1 Low','Q2 Medium','Q3 High','Q4 Top'])

# Exportació dels .csvs 

# 1. Bubble chart: sample 800 repos amb totes les variables necessàries
bubble = df[
    [
        'repo_owner',
        'repo_project',
        'log_files',
        'log_watch',
        'log_size',
        'primary_language',
        'language_entropy'
    ]
].copy()

bubble = bubble.sample(1000, random_state=42).reset_index(drop=True)

bubble['size_bubble'] = (
    (bubble['log_size'] - bubble['log_size'].min()) /
    (bubble['log_size'].max() - bubble['log_size'].min())
    * 95 + 5
).round(1)

bubble = bubble[
    [
        'repo_owner',
        'repo_project',      # label
        'log_files',         # X
        'log_watch',         # Y
        'size_bubble',       # mida
        'primary_language',  # color/grup
        'language_entropy'   
    ]
]

bubble.to_csv(
    os.path.join(ROOT, "data", "infogram_viz1_bubble.csv"),
    index=False
)

# 2. Language diversity: entropy per language + stacked %
div_rows = []
for lang in top15:
    sub = df[df['primary_language']==lang]
    counts = sub['div_level'].value_counts()
    tot = len(sub)
    div_rows.append({
        'language': lang,
        'n': tot,
        'median_entropy': round(sub['language_entropy'].median(), 3),
        'Single_%': round(counts.get('Single',0)/tot*100,1),
        'Low_2_%': round(counts.get('Low (2)',0)/tot*100,1),
        'Medium_3_4_%': round(counts.get('Medium (3-4)',0)/tot*100,1),
        'High_5_10_%': round(counts.get('High (5-10)',0)/tot*100,1),
        'Polyglot_10plus_%': round(counts.get('Polyglot (10+)',0)/tot*100,1),
    })
pd.DataFrame(div_rows).to_csv(os.path.join(ROOT, "data", "infogram_viz2_diversity.csv"), index=False)

# 3. Language popularity ranking
lang_rank = df[df['primary_language'].isin(top15)].groupby('primary_language').agg(
    median_watch=('watch_count','median'),
    q25_watch=('watch_count', lambda x: round(x.quantile(0.25),1)),
    q75_watch=('watch_count', lambda x: round(x.quantile(0.75),1)),
    mean_watch=('watch_count','mean'),
    median_files=('file_rows','median'),
    median_entropy=('language_entropy','median'),
    n=('watch_count','count')
).sort_values('median_watch', ascending=False).reset_index()
lang_rank.to_csv(os.path.join(ROOT, "data", "infogram_viz3_lang_rank.csv"), index=False)

# 4a. Cluster temporal stacked bar
temporal_rows = []
for yr in sorted(df['first_event_year'].unique()):
    sub = df[df['first_event_year']==yr]
    tot = len(sub)
    row = {'year': int(yr), 'total_repos': tot}
    for cn in ['Repositoris petits','Repositoris mitjans','Repositoris profunds','Repositoris grans']:
        row[cn+'_%'] = round(len(sub[sub['cluster']==cn])/tot*100,1)
        row[cn+'_n'] = len(sub[sub['cluster']==cn])
    temporal_rows.append(row)
pd.DataFrame(temporal_rows).to_csv(os.path.join(ROOT, "data", "infogram_viz4a_temporal.csv"), index=False)

# 4b. Cluster profiles (for radar / grouped bar in Infogram)
cluster_profiles = []
for cn in ['Repositoris petits','Repositoris mitjans','Repositoris profunds','Repositoris grans']:
    sub = df[df['cluster']==cn]
    cluster_profiles.append({
        'cluster': cn,
        'n': len(sub),
        'median_watch': round(sub['watch_count'].median(),1),
        'median_files': round(sub['file_rows'].median(),1),
        'median_path_depth': round(sub['avg_path_depth'].median(),3),
        'median_languages': round(sub['num_languages_total'].median(),1),
        'median_binary_ratio': round(sub['binary_ratio'].median(),4),
        'median_entropy': round(sub['language_entropy'].median(),3),
    })
pd.DataFrame(cluster_profiles).to_csv(os.path.join(ROOT, "data", "infogram_viz4b_cluster_profiles.csv"), index=False)

# 4c. Full dataset with cluster label for scatter in Infogram
scatter_full = df[['repo_project','repo_owner','primary_language','watch_count','file_rows',
                    'avg_path_depth','language_entropy','num_languages_total',
                    'log_files','log_watch','cluster','first_event_year']].copy()
scatter_full.to_csv(os.path.join(ROOT, "data", "infogram_viz4c_scatter_clusters.csv"), index=False)

# 5. Relacions entre variables (per anotacions)
r_files = np.corrcoef(df['log_files'], df['log_watch'])[0,1]
r_depth = np.corrcoef(df['avg_path_depth'], df['log_watch'])[0,1]
r_size  = np.corrcoef(df['log_size'], df['log_watch'])[0,1]

# 6. Top repos per annotate bubble
top15r = df.nlargest(15,'watch_count')[['repo_project','repo_owner','primary_language','watch_count','file_rows','avg_path_depth']].round(2)
top15r.to_csv(os.path.join(ROOT, "data", "infogram_top15_repos.csv"), index=False)