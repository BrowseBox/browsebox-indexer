FROM mysql/mysql-server:latest

ENV MYSQL_DATABASE=browsebox\
    MYSQL_ROOT_PASSWORD=password \
    MYSQL_ROOT_HOST=%

# Run SQL scripts
ADD ./prisma/database/image.sql /docker-entrypoint-initdb.d/

EXPOSE 3306
