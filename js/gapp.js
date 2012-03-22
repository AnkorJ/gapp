(function() {

    var GAPP = {};

    GAPP.Resource = Backbone.Model.extend({

        initialize: function(){

        }

    });

    GAPP.ResourceCollection = Backbone.Collection.extend({

        model: GAPP.Resource

    });

    GAPP.SavedSearch = Backbone.Model.extend({

    });

    GAPP.SavedSearchCollection = Backbone.Collection.extend({

        model: GAPP.SavedSearch,

        fetch: function(){

        }

    });

    window.GAPP = GAPP;

}).call(this);
