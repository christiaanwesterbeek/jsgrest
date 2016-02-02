import pg from '@motiz88/pg';
import testConfig from '../config.json';
import {exec} from 'mz/child_process';
import shellEscape from 'shell-escape-tag';

async function execSqlFile(file, connectionString) {
    const [stdout, stderr] = await exec(shellEscape `${testConfig.database.psql} --file=${file}
        --set=client_min_messages=warning
        ${connectionString || testConfig.database.connectionStringWithDatabase}`);
    if (stderr)
        throw new Error(stderr);
    return stdout;
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

        const psqlBanner = await exec(shellEscape `${testConfig.database.psql} --version`);

        if (this.firstSetup) {
            if (psqlBanner[0])
                console.log(psqlBanner[0]);
            if (psqlBanner[1])
                console.error(psqlBanner[1]);
            await execSqlFile(require.resolve('../fixtures/database.sql'),
                testConfig.database.connectionString);
            await execSqlFile(require.resolve('../fixtures/schema.sql'));
            this.firstSetup = false;
        }

        if (this.setupCount === 0) {
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
    firstSetup = true;
}

export default new TestDb();
