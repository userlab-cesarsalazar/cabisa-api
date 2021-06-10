# Cabisa API

## Install Dependencies

- In the folder `layers/nodejs` run `npm install`
- Then run `npm install` in the folder of the service you want to start

## Install DB

- Go to folder `migrations` and create a `database.json` file with your DB credentials
- Then in the folder `layers/nodejs` run `npm run db db:create your-db-name` to create a DB with your current config
- Then you can run the migrations (in the same folder) with `npm run db up:migrate` and seeders `npm run db up:seed`

## Migrations and Seeders

- Create new seeder: `npm run db create:seed your-seeder-name`
- Create new migration: `npm run db create:migrate your-migration-name`
- Reset migrations: `npm run db reset:migrate`
- Drop database according to your current config `npm run db db:drop your-db-name`
