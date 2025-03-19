import pandas as pd

def clean_countries():
    file_in='INPUT/Country_2-3_Digits_Codes.xls'
    file_out='OUTPUT/cfg_countries.csv'
    df = pd.read_csv(file_in)
    df = df.rename(columns={'COUNTRY': 'country', 'A2': 'alpha2', 'A3': 'alpha3','NUM':'country_num','DIALINGCODE':'country_code'})
    df.to_csv(file_out, index=False)

#clean_countries()


def clean_carriers():
    file_in='INPUT/ContryCode.xls'
    file_out='OUTPUT/cfg_carriers.csv'
    df = pd.read_excel(file_in)
    df['COUNTRY_CODE'] = pd.to_numeric(df['COUNTRY_CODE'], errors='coerce')
    df['COUNTRY_CODE'] = df['COUNTRY_CODE'].astype('Int64').astype(str)

    df = df.rename(columns={'PLMNNAME': 'carrier_name', 'COUNTRY': 'country_name', 'COUNTRY_CODE':'country_code', 'NATIONAL_DESTINATION_CODE':'national_destination_code', 'ID':'carrier_id'})
    df['country_name'] = df['country_name'].str.title()
    df.to_csv(file_out, index=False)
#clean_carriers()


def gen_carriers():
    df_carriers = pd.read_csv('OUTPUT/cfg_carriers.csv')
    df_countries = pd.read_csv('OUTPUT/cfg_countries.csv')
    df_carriers['country_code'] = pd.to_numeric(df_carriers['country_code'], errors='coerce')
    df_carriers['country_code'] = df_carriers['country_code'].astype('Int64').astype(str)
    df_carriers['country_name'] = df_carriers['country_name'].str.lstrip()
    df_carriers['country_name'] = df_carriers['country_name'].str.rstrip()
    # replace common values
    df_carriers['country_name'] = df_carriers['country_name'].replace('Russia', 'Russian Federation')
    df_carriers['country_name'] = df_carriers['country_name'].replace('Uk', 'United Kingdom')
    df_carriers['country_name'] = df_carriers['country_name'].replace('Royaume-Uni', 'United Kingdom')
    df_carriers['country_name'] = df_carriers['country_name'].replace('Usa', 'United States')
    df_carriers['country_name'] = df_carriers['country_name'].replace('Réunion', 'Reunion')
    df_carriers['country_name'] = df_carriers['country_name'].replace('Sureguernsey', 'Guernsey')
    df_carriers['country_name'] = df_carriers['country_name'].replace('Trinidad And Tobago', 'Trinidad and Tobago')
    df_carriers['country_name'] = df_carriers['country_name'].replace('Cayman', 'Cayman Islands')
    df_carriers['country_name'] = df_carriers['country_name'].replace('Domenica', 'Dominica')
    df_carriers['country_name'] = df_carriers['country_name'].replace('Tunis', 'Tunisia')
    df_carriers['country_name'] = df_carriers['country_name'].replace('Turks And Caicos', 'Turks and Caicos Islands')
    df_carriers['country_name'] = df_carriers['country_name'].replace('Saintkitts', 'Saint Kitts and Nevis')
    df_carriers['country_name'] = df_carriers['country_name'].replace('British Virgin Islan', 'British Virgin Islands')
    df_carriers['country_name'] = df_carriers['country_name'].replace('Curaçao', 'Curacao')
    df_carriers['country_name'] = df_carriers['country_name'].replace('Britishvirginislands', 'British Virgin Islands')
    df_carriers['country_name'] = df_carriers['country_name'].replace('Antigua', 'Antigua and Barbuda')

# merge
    merged_df = pd.merge(df_carriers, df_countries, left_on='country_name', right_on='country', how='left')
    merged_df = merged_df.rename(columns={'country_code_x': 'country_code'})
    df_completed = merged_df[merged_df['alpha2'].notna()]
    df_completed1 = df_completed[['carrier_id', 'carrier_name', 'country_name', 'country_code', 'national_destination_code']]    
    df_uncompleted = merged_df[pd.isnull(merged_df['alpha2'])]
    df_uncompleted = df_uncompleted[['carrier_id', 'carrier_name', 'country_name', 'country_code', 'national_destination_code']] 
    print (len(df_carriers), len(df_completed1),len(df_uncompleted))
    print(df_completed1.head())


# Step 2
    df_countries_simple = df_countries.groupby('country_code').filter(lambda x: len(x) == 1)  
    merged_df = pd.merge(df_uncompleted, df_countries_simple, left_on='country_code', right_on='country_code', how='left')
    df_completed = merged_df[merged_df['alpha2'].notna()]
    df_completed2 = df_completed[['carrier_id', 'carrier_name', 'country', 'country_code', 'national_destination_code']]  
    df_completed2 = df_completed2.rename(columns={'country': 'country_name'})
    df_uncompleted = merged_df[pd.isnull(merged_df['alpha2'])]
    df_uncompleted = df_uncompleted[['carrier_id', 'carrier_name', 'country_name', 'country_code', 'national_destination_code']] 

# Step 3
    merged_df = pd.merge(df_uncompleted, df_countries, left_on='carrier_name', right_on='country', how='left')
    merged_df = merged_df.rename(columns={'country_code_x': 'country_code'})
    df_completed = merged_df[merged_df['alpha2'].notna()]
    df_completed3 = df_completed[['carrier_id', 'carrier_name', 'country_name', 'country_code', 'national_destination_code']]
    df_completed3 = df_completed3.assign(
        carrier_name=df_completed3['country_name'],
        country_name=df_completed3['carrier_name']
    )
    df_uncompleted = merged_df[pd.isnull(merged_df['alpha2'])]
    df_uncompleted = df_uncompleted[['carrier_id', 'carrier_name', 'country_name', 'country_code', 'national_destination_code']] 
    frames = [df_completed1, df_completed2, df_completed3]
    df_carriers_all = pd.concat(frames)
    df_carriers_all.to_csv('1.csv', index=False)
    df_uncompleted.to_csv('2.csv', index=False)

#gen_carriers()


def gen_countries_sql():
    table_name = 'dim_countries'
    filename = 'ins_countries.sql'
    df = pd.read_csv('OUTPUT/countries_all.csv')

    insert_statements = []
    for index, row in df.iterrows():
        columns = ', '.join(row.index)
        values = ', '.join(f"'{str(value)}'" if isinstance(value, str) else str(value) for value in row.values) 
        insert_statement = f"INSERT INTO {table_name} ({columns}) VALUES ({values});"
        insert_statements.append(insert_statement)

    sql_script = '\n'.join(insert_statements)

    
    with open(filename, 'w') as file:
        file.write(sql_script)
gen_countries_sql()


def gen_carriers_sql():
    table_name = 'dim_carriers'
    filename = 'ins_carriers.sql'
    df_carriers = pd.read_csv('OUTPUT/carriers_all.csv')
    df_countries = pd.read_csv('OUTPUT/countries_all.csv')
    df_merged = pd.merge(df_carriers, df_countries, left_on='country_name', right_on='country', how='left')
    df_merged = df_merged.rename(columns={'country_code_x': 'country_code'})    
    df = df_merged[['carrier_id', 'carrier_name', 'country_name', 'country_code', 'national_destination_code']]
    insert_statements = []
    for index, row in df.iterrows():
        columns = ', '.join(row.index)
        values = ', '.join(f"'{str(value)}'" if isinstance(value, str) else str(value) for value in row.values) 
        insert_statement = f"INSERT INTO {table_name} ({columns}) VALUES ({values});"
        insert_statements.append(insert_statement)

    sql_script = '\n'.join(insert_statements)

    
    with open(filename, 'w') as file:
        file.write(sql_script)
gen_carriers_sql()


def gen_carriers_sql2():
    table_name = 'dim_carriers'
    filename = 'ins_carriers.sql'
    df_carriers = pd.read_csv('OUTPUT/carriers_all.csv')
    df_countries = pd.read_csv('OUTPUT/countries_all.csv')
    df_carriers['country_code'] = pd.to_numeric(df_carriers['country_code'], errors='coerce')
    df_carriers['country_code'] = df_carriers['country_code'].astype('Int64').astype(str)
    #df_countries['country_code'] = df_countries['country_code'].astype('Int64')
    merged_df = pd.merge(df_carriers, df_countries, left_on='country_name', right_on='country', how='left')
    df = merged_df[merged_df['official_name_fr'].notna()]
    df = df[['carrier_name', 'country_code','national_destination_code','country']]
    insert_statements = []
    for index, row in df.iterrows():
        carrier_name = row['carrier_name']
        country_code = row['country_code']
        national_destination_code = row['national_destination_code']
        official_name_en = row['country']
        
        insert_statement = (
            f"INSERT INTO {table_name} (carrier_name, country_code, national_destination_code, country_id) "
            f"VALUES ('{carrier_name}', '{country_code}', '{national_destination_code}',"
            f"(SELECT id FROM dim_countries WHERE name = '{official_name_en}'));"
        )
        insert_statements.append(insert_statement)
    sql_script = '\n'.join(insert_statements)
    
    with open(filename, 'w') as file:
        file.write(sql_script)
