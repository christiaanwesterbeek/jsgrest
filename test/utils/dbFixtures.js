import pg from '@motiz88/pg';
import testConfig from '../config.json';
import child_process from 'mz/child_process';
import shellEscape from 'shell-escape-tag';

function execSqlFile(file) {
    return child_process.exec(shellEscape
        `${testConfig.database.psql} --file=${file} ${testConfig.database.connectionString}`
    );
}

class TestDb {
    constructor() {

    }


    async setup() {
        await new Promise(
            (resolve, reject) => pg.connect(this.connectionString, (err, client, done) => {
                if (err) {
                    done();
                    return reject(err);
                }
                done();

                resolve();
            }));

        await child_process.exec(shellEscape `${testConfig.database.psql} --version`);


        if (this.setupCount === 0) {
            await execSqlFile(require.resolve('../fixtures/database.sql'));
            await execSqlFile(require.resolve('../fixtures/schema.sql'));
            await execSqlFile(require.resolve('../fixtures/data.sql'));
        }

        ++this.setupCount;

        return this.connectionString;
    }

    teardown() {
        --this.setupCount;
    }

    connectionString = testConfig.database.connectionString;
    setupCount = 0;
}

export default new TestDb();