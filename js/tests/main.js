$(function(){

    test("model structure", function() {

        resource = new GAPP.Resource();

        equal(resource.get('title'), "one", "oh.");

    });

});