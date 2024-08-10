# https://www.tomray.dev/nestjs-docker-production
# BUILD FOR PRODUCTION

#telechargement d'une image de node version 20 et version alpine
FROM node:21.6.2-alpine As base 

#configuration de la variable d'environnement  NODE_ENV
ENV NODE_ENV="production"

FROM base AS installer

RUN apk add --no-cache libc6-compat
# Set working directory
#Creation du dossier /app
WORKDIR /app
#et dans ce dossier nous allons copier le package.json
COPY --chown=node:node ./package*.json ./
COPY --chown=node:node ./start.sh ./start.sh

#ensuite nous allons copier dans app tout notre travail
COPY --chown=node:node . .

# ici on installe tous les dépendance sauf les dépendence de developpement 
#puisque nous sommes en environnement de production
#comme on a besoin des dépendances de devellopement 
#pour build l'application on incut --include=dev
RUN npm install --include=dev
#RUN npm ci
#on rajoute le dossier prisma 
ADD prisma prisma
#on execute la commande npx prisma generate pour generer 
#les declaration de type et le code source de notre schema.prisma
RUN npx prisma generate

RUN npm run build
#puisqu'on a pas envi des fichier de dev inscrit lors de la
#construction on repart de la base vierge, on cree un nouveau dosssier

FROM base as prunner
WORKDIR /app
#de la base installer on copy tous ce qui est dans /app/node_modules
#pour mettre dans le dossier ./node_modules qui est dans le deossier app de cette nouvelle base 
COPY --from=installer /app/node_modules ./node_modules
COPY ./package*.json ./
#la on fait un npm prune et on ommet toutes les dépendance
RUN npm prune --omit=dev

#on repart de nouveaus d'une base vierge
FROM base AS runner
WORKDIR /app

ENV TZ=Europe/Paris
#on charge les librairies associé au fuseau horaire 
#puisque necessaire dans l'application
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && apk del tzdata
    
# Don't run production as root
#nous creeons un groupe et un utilisateur que sont nodejs et nestjs
RUN addgroup --system --gid 1024 nodejs
RUN adduser --system --uid 1024 nestjs

USER nestjs

COPY --chown=nestjs:nodejs --from=prunner /app/package.json ./package.json
COPY --chown=nestjs:nodejs --from=installer /app/dist ./dist
COPY --chown=nestjs:nodejs --from=prunner /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs --from=installer /app/start.sh ./start.sh
COPY --chown=nestjs:nodejs --from=installer /app/prisma ./prisma

# CMD ["sh", "-c", "while :; do echo 'Container is running...'; sleep 60; done"]

CMD ["sh", "start.sh"]
# ENTRYPOINT ["start.sh"]