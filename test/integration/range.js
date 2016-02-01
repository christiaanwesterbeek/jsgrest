import chai, {expect} from 'chai';
import createApp from '../../src/app';
import dbFixtures from '../utils/dbFixtures';

before(async function() {
    this.timeout(60000);
    await dbFixtures.setup();
});

after(async function() {
    await dbFixtures.teardown();
});

describe('Range', function() {
    let app;
    before(function() {
        app = createApp({
            connectionString: dbFixtures.connectionString,
            schema: 'test'
        });
    });

    describe('GET /items', function() {
        describe('without range headers', function() {
            describe('with response under server size limit', function() {
                it('returns whole range with status 200', async function() {
                    const res = await chai.request(app).get('/items');
                    res.should.have.status(200);
                });
            });

            describe('when I don\'t want the count', function() {
                it('returns range Content-Range with /*', async function() {
                    const res = await chai.request(app).get('/menagerie')
                        .set('Prefer', 'count=none');
                    res.should.have.status(200);
                    res.body.should.deep.equal([]);
                    res.should.have.header('Content-Range', '*/*');
                });

                it('returns range Content-Range with range/*', async function() {
                    const res = await chai.request(app).get('/items?order=id')
                        .set('Prefer', 'count=none');
                    res.should.have.status(200);
                    res.body.should.deep.equal([{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5},
                        {id: 6}, {id: 7}, {id: 8}, {id: 9}, {id: 10}, {id: 11}, {id: 12}, {id: 13},
                        {id: 14}, {id: 15}]);
                    res.should.have.header('Content-Range', '0-14/*');
                });

                it('returns range Content-Range with range/* '
                    + 'even using other filters', async function() {
                    const res = await chai.request(app).get('/items?id=eq.1&order=id')
                        .set('Prefer', 'count=none');
                    res.should.have.status(200);
                    res.body.should.deep.equal([{
                        id: 1
                    }]);
                    res.should.have.header('Content-Range', '0-0/*');
                });
            });
        });

        describe('with range headers', function() {
            describe('of acceptable range', function() {
                it('succeeds with partial content', async function() {
                    const res = await chai.request(app).get('/items')
                        .set('Range', '0-1')
                        .set('Range-Units', 'items');
                    res.should.have.status(206);
                    res.should.have.header('Content-Range', '0-1/15');
                });

                it('understands open-ended ranges', async function() {
                    const res = await chai.request(app).get('/items')
                        .set('Range', '0-')
                        .set('Range-Units', 'items');
                    res.should.have.status(200);
                });

                it('returns an empty body when there are no results', async function() {
                    const res = await chai.request(app).get('/menagerie')
                        .set('Range', '0-1')
                        .set('Range-Units', 'items');
                    res.should.have.status(200);
                    res.body.should.deep.equal([]);
                    res.should.have.header('Content-Range', '*/0');
                });

                it('allows one-item requests', async function() {
                    const res = await chai.request(app).get('/items')
                        .set('Range', '0-0')
                        .set('Range-Units', 'items');
                    res.should.have.status(206);
                    res.should.have.header('Content-Range', '0-0/15');
                });

                it('handles ranges beyond collection length via truncation', async function() {
                    const res = await chai.request(app).get('/items')
                        .set('Range', '10-100')
                        .set('Range-Units', 'items');
                    res.should.have.status(206);
                    res.should.have.header('Content-Range', '10-14/15');
                });
            });

            describe("of invalid range", function() {
                it('fails with 416 for offside range', async function() {
                    const res = await chai.request(app).get('/items')
                        .set('Range', '1-0')
                        .set('Range-Units', 'items');
                    res.should.have.status(416);
                });

                it('refuses a range with nonzero start when there are no items', async function() {
                    const res = await chai.request(app).get('/menagerie')
                        .set('Range', '1-2')
                        .set('Range-Units', 'items');
                    res.should.have.status(416);
                    expect(res.body).to.be.null;
                    res.should.have.header('Content-Range', '*/0');
                });

                it('refuses a range requesting start past last item', async function() {
                    const res = await chai.request(app).get('/items')
                        .set('Range', '100-199')
                        .set('Range-Units', 'items');
                    res.should.have.status(416);
                    expect(res.body).to.be.null;
                    res.should.have.header('Content-Range', '*/15');
                });
            });
        });
    });
});
