# browsebox-indexer

[![Build status](https://github.com/browsebox/browsebox-indexer/actions/workflows/ci.yml/badge.svg?branch=master&event=push)](https://github.com/browsebox/browsebox-indexer/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/release/browsebox/browsebox-indexer.svg)](https://github.com/browsebox/browsebox-indexer/releases/latest)
[![CodeFactor](https://www.codefactor.io/repository/github/browsebox/browsebox-indexer/badge?s=583cd6c16d10140dcd4287f6577a6f98db531ea8)](https://www.codefactor.io/repository/github/browsebox/browsebox-indexer)

Upload, edit, and retrieve image files from an Amazon S3 bucket.

## Setting up your environment

Please make sure you have the following prerequisites:

- Node.js 19.8.1+
- Docker and Docker Compose
- Git

## Running browsebox-indexer

- Open any terminal of your choice.
- Clone this repository.

### Installing Node dependencies

Run the following command to install `npm` dependencies:

```bash
npm install
```

## Configuring Prisma

browsebox-indexer uses the [Prisma](https://www.prisma.io/) library to interact with MySQL. Before we can start interacting with the database, we need to generate the Prisma mappings.
```bash
npx prisma generate --schema ./prisma/schema.prisma
```

### Building docker image

Managing docker images and containers can be done from Docker Desktop, but we will be using the CLI to setup our database.
Navigate to the root of the repository and run this command to build an image of the database.

```bash
docker build -t browsebox-image-database .
```

This will build a fresh image with nothing stored in the database except for the table structure.

Ensure your image is up-to-date and rebuild periodically whenever neccessary. In order to update the image, you must remove the image with `docker image rm [image-name]` and rerun the build command.

### Running with `docker-compose`

Once you've finished building the image, run this command to start the browsebox-indexer database in detached mode.

```bash
docker-compose up -d
```

### Running the server
To run the server in development mode use:
```bash
npm run dev
```

## Licence

BrowseBox code is licensed under the [MIT licence](https://opensource.org/licenses/MIT). Please see [the licence file](LICENCE) for more information. [tl;dr](https://tldrlegal.com/license/mit-license) you can do whatever you want as long as you include the original copyright and license notice in any copy of the software/source.
