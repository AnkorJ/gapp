/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, strict:true, undef:true, unused:true, curly:true, browser:true, jquery:true, indent:4, maxerr:200 */
/*global Backbone locache _ google */

$(function () {

    "use strict";

    locache.cleanup();

    function throttle(fn, delay) {
        var timer = null;
        return function () {
            var context = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () {
                fn.apply(context, args);
            }, delay);
        };
    }

    var GAPP = {};

    var BaseModel = Backbone.Model.extend({

        cache: true,
        cache_time: 600,
        queryData: {},
        currentQueryData: {},

        fetch: function (options) {
            options = options || (options = {});
            var data = options.data || (options.data = {});
            if (!data.nhs && $('#id_nhs').is(':checked')) {
                data.nhs = 1;
            }
            if (!data.future_events && $('#id_future_events').is(':checked')) {
                data.event = '*';
            }
            options.data = $.extend({}, this.queryData, data);
            this.currentQueryData = options.data;
            Backbone.Model.prototype.fetch.call(this, options);
        }

    });

    var BaseCollection = Backbone.Collection.extend({

        cache: true,
        cache_time: 600,
        queryData: {},
        currentQueryData: {},

        fetch: function (options) {
            options = options || (options = {});
            var data = options.data || (options.data = {});
            if (!data.nhs && $('#id_nhs').is(':checked')) {
                data.nhs = 1;
            }
            if (!data.future_events && $('#id_future_events').is(':checked')) {
                data.event = '*';
            }
            options.data = _.extend({}, this.queryData, data);
            this.currentQueryData = options.data;
            Backbone.Collection.prototype.fetch.call(this, options);
        }

    });



    var Resource = BaseModel.extend({

        queryData: {
        },

        url: function () {
            var id = this.get('id');
            return 'http://www.aliss.org/api/resources/' + id + '/';
        },

        parse: function (result) {
            if (result.data) {
                return result.data[0];
            } else {
                return result;
            }
        }

    });

    var ResourceCollection = BaseCollection.extend({

        model: Resource,
        url: 'http://www.aliss.org/api/resources/search/',

        queryData: {
            'max': 10,
            'start': 0,
            'bootlocation': 10
        },

        pageNumber: 0,

        parse: function (result) {
            if (result.data[0]) {
                return result.data[0].results;
            }
            return [];
        },

        fetch: function (options) {

            options = options || (options = {});
            var data = options.data;

            var nhs = $('#id_nhs').is(":checked") ? 1 : undefined;
            var future_events = $('#id_future_events').is(":checked") ? 1 : undefined;

            if (data && (data.query !== this.currentQueryData.query ||
                        data.location !== this.currentQueryData.location ||
                        this.currentQueryData.nhs !== nhs ||
                        this.currentQueryData.event !== future_events)) {
                this.pageNumber = 0;
            }

            return BaseCollection.prototype.fetch.call(this, options);

        },

        nextPage: function () {

            // If this page has less than the max per page, we are alread
            if (this.length < this.queryData.max) {
                return;
            }
            var page = this.pageNumber + 1;
            this.goToPage(page);
        },

        previousPage: function () {
            var page = this.pageNumber - 1;
            if (page < 0) {
                page = 0;
            }
            this.goToPage(page);
        },

        firstPage: function () {
            this.goToPage(0);
        },

        goToPage: function (pageNumber) {

            this.pageNumber = pageNumber;
            var data = _.clone(this.currentQueryData);
            data.start = data.max * this.pageNumber;
            this.fetch({data: data});

        }

    });

    var Query = Resource.extend({

        parse: function (result) {
            if (result.data) {
                return {title: result.data[0].title};
            } else {
                return {title: result.title};
            }
        }

    });

    var QueryCollection = ResourceCollection.extend({

        model: Query
    });

    var SavedSearch = BaseModel.extend({
    });

    var SavedSearchCollection = BaseCollection.extend({

        url: 'http://www.aliss.org/api/savedsearchesbyIP/',

        model: SavedSearch,

        parse: function (result) {
            var terms = result.data;

            var saved = [];

            _.each(terms, function (term) {
                var location = '', query = '';
                //term.split(',').pop()
                if (term.indexOf(',') > 0) {
                    location = term.split(',').pop();
                }
                var trim = location.length > 0 ? location.length + 1: 0;
                query = $.trim(term.substring(0, term.length - trim));
                location = $.trim(location);

                saved.push({
                    location: location,
                    query: query
                });

            });

            return saved;


        }

    });

    var GoogleMapView = Backbone.View.extend({

        markers: [],
        mapInitialized: false,

        initialize: function (options) {
            this.results = options.results;
            this.$el.hide();
        },

        initMap: function () {
            this.map = new google.maps.Map(this.el, {
                zoom: 13,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                center: new google.maps.LatLng(55.848125, -4.437196)
            });
            this.mapInitialized = true;
        },

        addMarker: function (position, content, title) {

            if (!this.mapInitialized) {
                this.initMap();
            }

            var map = this.map;
            var that = this;

            var marker = new google.maps.Marker({
                map: this.map,
                animation: google.maps.Animation.DROP,
                position: position,
                title: title
            });

            this.markers.push(marker);

            var infowindow = new google.maps.InfoWindow({
                content: content
            });

            google.maps.event.addListener(marker, 'click', function () {
                if (that.current) {
                    that.current.close();
                }
                infowindow.open(map, marker);
                that.current = infowindow;
            });

        },

        removeMarkers: function () {

            _.each(this.markers, function (marker) {
                marker.setMap(null);
            });
        },

        addResourceMarkers: function (resources) {

            if (!this.mapInitialized) {
                this.initMap();
            }

            this.removeMarkers();
            this.markers = [];

            var that = this;

            var markerbounds = new google.maps.LatLngBounds();

            _.each(resources, function (resource) {
                _.each(resource.locations, function (location) {
                    var latlng = location.split(', ');
                    var glatlng = new google.maps.LatLng(latlng[0], latlng[1]);
                    markerbounds.extend(glatlng);
                    that.addMarker(glatlng, resource.title + "<br/>" + '<a href="#!/resource/' + resource.id + '">Details</a>', resource.title + " (" + resource.locationnames[0] + ")");
                });
            });

            this.map.fitBounds(markerbounds);

        },

        render: function () {

            if (this.results.length === 0) {
                if (this.mapInitialized) {
                    this.$el.hide();
                    this.mapInitialized = false;
                }
                return;
            }

            if (!this.mapInitialized) {
                this.initMap();
            }

            this.addResourceMarkers(this.results.toJSON());

        },

        setZoom: function (zoom) {
            this.map.setZoom(zoom);
        }

    });

    // Create a global instance of the map - we only really ever want there
    // to be one.
    var google_map = new GoogleMapView({
        el: $('#search_map'),
        results: this.results
    });


    $('#resourceView').hide();
    $('#contact').hide();

    var ResourceView = Backbone.View.extend({

        el: $("#resourceView"),

        template: _.template($('#resource-template').html() || ""),
        emailTemplate: _.template($('#resource-email').html() || ""),

        events: {
            'click .back': 'hide',
            'click .email': 'emailEvent',
            'click .print': 'print'
        },

        results: new ResourceCollection(),

        initialize: function (searchView) {

            this.searchView = searchView;
            this.map = google_map;
        },

        showResource: function (resource) {
            var jsonResource = resource.toJSON();
            this.resources = [jsonResource];
            this.render([jsonResource], [jsonResource]);
        },

        showResources: function (resources) {
            this.resources = resources.toJSON();
            var jsonResources = this.resources;
            this.render(jsonResources, jsonResources);
        },

        hide: function (e) {
            e.preventDefault();
            $("#map_hide").click();
            this.searchView.search();
            return false;
        },

        show: function () {
            $('#search_results').hide();
            $('#resourceView').show();
        },

        emailEvent: function (e) {
            e.preventDefault();
            this.email();
            return false;
        },

        email: function (resources) {
            var title = '', description = '';
            if (!resources) {
                resources = this.resources;
            }
            if (resources.length > 1) {
                title = resources.length + " ALISS Resources";
            }
            var template = this.emailTemplate;
            $.each(resources, function (i, r) {
                description += template(r);
            });
            description = description.replace(/\n/g, '%0D%0A');
            window.location = "mailto:?Subject=" + title + "&body=" + description;
        },

        print: function () {
            window.print();
        },

        render: function (resources, markers) {
            $('#resourceView').html(this.template({
                resources: resources
            }));
            $('#map_show').click();
            this.show();
            this.map.addResourceMarkers(markers);
            this.map.setZoom(14);
            this.delegateEvents();
        }

    });

    var app;

    var SearchView = Backbone.View.extend({

        tagName: "li",
        el: $("#app"),

        template: _.template($('#result-template').html() || ""),
        templateLoading: _.template($('#result-loading').html() || ""),
        templateSavedSearches: _.template($('#saved-search').html() || ""),

        events: {
            'keypress #id_query': 'search_auto',
            'keypress #id_location': 'search_auto',
            'click #search': 'search_click',
            'click .next': 'nextPage',
            'click .previous': 'previousPage',
            'click .first': 'firstPage',
            'click .detail': 'showResource',
            'click input.select_all': 'selectAll',
            'click input.result_individual': 'resultSelect',
            'click .print_selected': 'print',
            'click .email_selected': 'email'
        },

        results: new ResourceCollection(),

        initialize: function () {


            var savedSearches = new SavedSearchCollection();

            savedSearches.fetch();

            this.map = google_map;
            this.map.results = this.results;

            this.results.on('reset', this.map.render, this.map);
            this.results.on('reset', this.render, this);

            this.resourceView = new ResourceView(this);

            this.setupAutocomplete();
            this.search_timer = null;

        },

        showLoading: function () {
            this.render(this.templateLoading);
        },

        search: function () {
            this.showLoading();
            var query = $('#id_query').val(), location = $('#id_location').val();

            if (location) {
                this.router.navigate("!/search/" + query + "/" + location);
            } else {
                this.router.navigate("!/search/" + query);
            }
            this.results.fetch({data: $('#search_form').serializeHash()});
        },

        search_click: function (event) {
            event.preventDefault();
            this.search();
            return false;
        },

        search_auto: throttle(function () {
            this.search();
            return true;
        }, 500),

        saved_search: function (event) {
            event.preventDefault();
            var location = $(event.currentTarget).data('location');
            var query = $(event.currentTarget).data('query');

            $('#id_location').val(location);
            $('#id_query').val(query);
            this.search();
            return false;
        },

        search_for: function (query, location) {
            $('#id_location').val(location);
            $('#id_query').val(query);
            this.search();
            return false;
        },

        nextPage: function (event) {
            event.preventDefault();
            this.results.nextPage();
            return false;
        },

        previousPage: function (event) {
            event.preventDefault();
            this.results.previousPage();
            return false;
        },

        firstPage: function (event) {
            event.preventDefault();
            this.results.firstPage();
            return false;
        },

        setupAutocomplete: function () {

            var qc = new QueryCollection();
            var that = this;

            $("#id_query").autocomplete({

                minLength: 2,

                source: function (request, response) {

                    qc.on('reset', function () {
                        var titles = [];
                        qc.each(function (r) {
                            titles.push(r.get('title'));
                        });
                        response(titles);
                    });

                    qc.fetch({data: {
                        query: request.term,
                        location: $('#id_location').val()
                    }});

                }

            });

            $('#id_query').bind('autocompleteselect', function (event, ui) {
                that.search_auto();
            });

        },

        showResource: function (event) {
            event.preventDefault();
            var id = $(event.currentTarget).data('id');
            var resource = this.results.get(id);
            this.resourceView.showResource(resource);
            this.router.navigate("!/resource/" + resource.id);
            return false;
        },

        selectAll: function (e) {
            var checked = $(e.currentTarget).is(":checked");
            $('input.result-select').attr('checked', checked);
        },

        resultSelect: function (e) {

            var checked = $(e.currentTarget).is(":checked");
            if (!checked) {
                $('input.select_all').attr('checked', checked);
            }

        },

        render: function (template) {

            $('#resourceView').hide();
            $('#contact').hide();
            $('#search_results').show();
            if (!$.isFunction(template)) {
                template = this.template;
            }
            var context = _.clone(this.results.currentQueryData || {});
            context.resources =  this.results.toJSON();
            context.pageNumber = this.results.pageNumber + 1;
            $('#search_results').html(template(context));

            $('span.truncate').expander({slicePoint: 200});

            this.delegateEvents();
            return this;
        },

        print: function (e) {
            e.preventDefault();
            var selected = $(".result_individual:checked");
            var ids = [];
            $.each(selected, function (i, el) {
                ids.push($(el).val());
            });
            this.router.navigate("!/resource/" + ids.join("-"), {trigger: true});
            this.resourceView.print();
            return false;
        },

        email: function (e) {
            e.preventDefault();
            var selected = $(".result_individual:checked");

            var resources = new ResourceCollection();

            resources.on("add", function () {
                if (resources.length === selected.length) {
                    app.resourceView.email(resources.toJSON());
                }
            });

            $.each(selected, function (i, el) {
                var resource = new Resource({
                    id: $(el).val()
                });
                resource.on("change", function () {
                    resources.push(resource);
                    resource.fetch();
                });
                resource.fetch();
            });
            return false;

        }

    });

    app = new SearchView();

    var WorkspaceRouter = Backbone.Router.extend({

        routes: {
            "!/search/:query": 'search',
            "!/search/:query/:location": "search",
            "!/search/:query/:location/page/:page": "search",
            "!/resource/:id": "resource",
            "!/contact": 'contact'
        },

        search: function (query, location, page) {
            if (!location) {
                location = '';
            }
            app.search_for(decodeURIComponent(query), decodeURIComponent(location));
            page = parseInt(page, 10) - 1;
            if (page) {
                app.results.goToPage(page);
            }
        },

        resource: function (id) {

            $("#search_map").show();
            $("#map_show").hide();
            $("#map_hide").show();
            google.maps.event.trigger(google_map.map, 'resize');
            $('#search').click();
            google.maps.event.trigger(google_map.map, 'resize');

            var ids = id.split('-');

            if (ids.length === 1) {

                var resource = new Resource({
                    id: id
                });
                resource.on("change", function () {
                    app.resourceView.showResource(resource);
                });
                resource.fetch();

            } else if (ids.length > 1) {

                var resources = new ResourceCollection();

                resources.on("add", function () {
                    if (resources.length === ids.length) {
                        app.resourceView.showResources(resources);
                    }
                });

                _.each(ids, function (i) {
                    var resource = new Resource({
                        id: i
                    });
                    resource.on("change", function () {
                        resources.push(resource);
                        resource.fetch();
                    });
                    resource.fetch();
                });


            }


        },

        contact: function () {
            $('div.pannel').hide();
            $('#contact').show();

        }

    });

    app.router = new WorkspaceRouter();

    Backbone.history.start();

    window.GAPP = GAPP = {
        models: {
            Resource: Resource,
            SavedSearch: SavedSearch,
            Query: Query
        },
        collections: {
            SavedSearchCollection: SavedSearchCollection,
            ResourceCollection: ResourceCollection,
            QueryCollection: QueryCollection
        },
        views: {
            SearchView: SearchView
        }
    };

    var start = 75;

    var font_size = function (delta) {

        start = start + delta;

        $("body").css("font-size", start + "%");

    };

    $("#font_increase").click(function (e) {
        e.preventDefault();
        font_size(10);
        return false;
    });

    $("#font_decrease").click(function (e) {
        e.preventDefault();
        font_size(-10);
        return false;
    });

    $("#map_show").click(function (e) {
        e.preventDefault();
        $("#search_map").show();
        $("#map_show").hide();
        $("#map_hide").show();
        google.maps.event.trigger(google_map.map, 'resize');
        $('#search').click();
        return false;
    });


    $("#map_hide").click(function (e) {
        e.preventDefault();
        $("#search_map").hide();
        $("#map_show").show();
        $("#map_hide").hide();
        google.maps.event.trigger(google_map.map, 'resize');
        return false;
    });

    $('#map_hide').click();

});
