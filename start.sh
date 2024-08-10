#!/bin/sh

#on definit les permission
set -ex
#on execute les commande ci-dessous
npx prisma migrate deploy
npm run start