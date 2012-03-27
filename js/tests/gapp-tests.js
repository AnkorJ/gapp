$(function(){

    test("model creation and updating", function() {

        expect(4);

        // The following model instance is valid and taken from an API feed.
        // However, for the test, the title has been changed and for berevity
        // the description has been deleted.
        r = new GAPP.Resource({
            "score": 10.005193,
            "accounts": ["4d9fbd5789cb1673fb000000"],
            "description": "",
            "title": "fake title",
            "locations": ["55.842, -4.4238"],
            "locationnames": ["PA1 1YN, Paisley East and Ralston, Renfrewshire"],
            "tags": ["Advice and counselling, Mental Health"],
            "id": "4da0439689cb164d15000003",
            "uri": ""
        });

        // Check that change is called, and
        r.on("change", function(){
            equal(r.get('title'), "You First Advocacy.");
            start();
        });

        equal(r.get('title'), "fake title");
        equal(r.url(), 'http://www.aliss.org/api/resources/4da0439689cb164d15000003/');

        // Trigger a refresh of the model
        r.fetch();

        notEqual(r.get('title'), "You First Advocacy.");

        stop();

    });

    test("fetching a collection", function(){


        var rs = new GAPP.ResourceSearchCollection();
        rs.fetch({
            'success': function(){
                strictEqual(rs.length, 100);
                start();
            }
        });

        stop();

    });

});