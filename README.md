THE DOUBLES ARE DOUBLING



DOCKERING:

prep:
1. have docker (duh)
2. have lunix (duh but less obvious)
3. in the IDE, open CMD inside the /spoordok folder

cmds: (NOTE: these only work in the CMD, NOT in the docker cmd!)
1. "docker compose up --build", to build the thingy and launch it to docker
2. "docker compose down", stops and removes it out of docker. DO THIS IF YOU WANT TO COMMIT CHANGES TO DOCKER
3. logging stuff: "docker compose logs -f app", "docker compose logs -f db" (while docker running)
4. "docker exec -it my-sql-db mysql -u appuser -p", to get into the db. NOTE: you WILL be prompted for a password. 
    type password in, you cant visibly see it being typed though.
5. "docker inspect my-sql-db", checks properties of the DB, ALSO DB PASSWORD AND SUCH IS IN HERE TOO

notes:
1. we currently lack the ability to fetch and send data to DB, we need more code in spring for that
2. also im not sure but fairly sure that the created db in docker is completely empty




upating docker:

1. be on latest commit on main (duh)
2. docker-compose down; docker-compose up --build -d