/*jshint asi:true */

$(function(){

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

    var GAPP = {}

    var BaseModel = Backbone.Model.extend({

        cache: true,
        cache_time: 120,
        queryData: {},
        currentQueryData: {},

        fetch: function(options){
            options = options || (options = {})
            var data = options.data || (options.data = {})
            options.data = $.extend({}, this.queryData, data)
            this.currentQueryData = options.data
            Backbone.Model.prototype.fetch.call(this, options)
        }

    })

    var BaseCollection = Backbone.Collection.extend({

        cache: true,
        cache_time: 120,
        queryData: {},
        currentQueryData: {},

        fetch: function(options){
            options = options || (options = {})
            var data = options.data || (options.data = {})
            options.data = _.extend({}, this.queryData, data)
            this.currentQueryData = options.data
            Backbone.Collection.prototype.fetch.call(this, options)
        }

    })



    var Resource = BaseModel.extend({

        queryData: {
        },

        url: function(){
            var id = this.get('id')
            return 'http://www.aliss.org/api/resources/' + id + '/'
        },

        parse: function(result){
            if (result.data){
                return result.data[0]
            } else {
                return result
            }
        }

    })

    var ResourceCollection = BaseCollection.extend({

        model: Resource,
        url: 'http://www.aliss.org/api/resources/search/',

        queryData: {
            'max': 10,
            'start': 0,
            'bootlocation': 10
        },

        pageNumber: 0,

        parse: function(result) {
            if (result.data[0]){
                return result.data[0].results
            }
            return []
        },

        fetch: function(options){

            options = options || (options = {})
            var data = options.data

            if (data && (data.query !== this.currentQueryData.query || data.location !== this.currentQueryData.location)){
                this.pageNumber = 0
            }

            return BaseCollection.prototype.fetch.call(this, options)

        },

        nextPage: function(){

            // If this page has less than the max per page, we are alread
            if(this.length < this.queryData.max){
                return
            }
            var page = this.pageNumber + 1
            this.goToPage(page)
        },

        previousPage: function(){
            var page = this.pageNumber - 1
            if (page < 0){
                page = 0
            }
            this.goToPage(page)
        },

        firstPage: function(){
            var page = 0
            this.goToPage(0)
        },

        goToPage: function(pageNumber){

            this.pageNumber = pageNumber
            var data = _.clone(this.currentQueryData)
            data.start = data.max * this.pageNumber
            this.fetch({data:data})

        }

    })

    var Query = Resource.extend({

        parse: function(result){
            if (result.data){
                return {title: result.data[0].title}
            } else {
                return {title: result.title}
            }
        }

    })

    var QueryCollection = ResourceCollection.extend({

        model: Query
    })

    var SavedSearch = BaseModel.extend({

    })

    var SavedSearchCollection = BaseCollection.extend({

        model: SavedSearch,

        fetch: function(){
            this.reset([{
                query: "substance abuse",
                location: "glasgow"
            },{
                query: "substance abuse",
                location: 'aberdeen'
            },{
                query: "substance abuse"
            },{
                query: "mental health"
            },{
                query: "cafe"
            },{
                query: "multiple sclerosis"
            },{
                query: "substance abuse"
            },{
                query: "cancer"
            },{
                query: "mental health"
            },{
                query: "multiple sclerosis"
            }])
        }

    })

    var GoogleMapView = Backbone.View.extend({

        markers: [],
        mapInitialized: false,

        initialize: function(options){
            this.results = options.results
            this.$el.hide()
        },

        initMap: function(){
            this.map = new google.maps.Map(this.el, {
              zoom: 13,
              mapTypeId: google.maps.MapTypeId.ROADMAP,
              center: new google.maps.LatLng(55.848125, -4.437196)
            })
            this.mapInitialized = true
        },

        addMarker: function(position, content){

            if(!this.mapInitialized){
                this.$el.show()
                this.initMap()
            }

            var map = this.map

            var marker = new google.maps.Marker({
                map: this.map,
                animation: google.maps.Animation.DROP,
                position: position
            })

            this.markers.push(marker)

            var infowindow = new google.maps.InfoWindow({
                content: content
            })

            google.maps.event.addListener(marker, 'click', function() {
                infowindow.open(map, marker)
            })

        },

        removeMarkers: function(){

            _.each(this.markers, function(marker){
                marker.setMap(null)
            })
        },

        addResourceMarkers: function(resources){

            if(!this.mapInitialized){
                this.$el.show()
                this.initMap()
            }

            this.removeMarkers()
            this.markers = []

            var that = this

            var markerbounds = new google.maps.LatLngBounds()

            _.each(resources, function(resource){
                _.each(resource.locations, function(location){
                    var latlng = location.split(', ')
                    var glatlng = new google.maps.LatLng(latlng[0], latlng[1])
                    markerbounds.extend(glatlng)
                    that.addMarker(glatlng, resource.title + "<br/>" + '<a href="#!/resource/' + resource.id + '">Details</a>')
                })
            })

            this.map.fitBounds(markerbounds)

        },

        render: function(){

            if (this.results.length === 0){
                if (this.mapInitialized){
                    this.$el.hide()
                    this.mapInitialized = false
                }
                return
            }

            if(!this.mapInitialized){
                this.$el.show()
                this.initMap()
            }

            this.addResourceMarkers(this.results.toJSON())

        },

        setZoom: function(zoom){
            this.map.setZoom(zoom);
        }

    })

    // Create a global instance of the map - we only really ever want there
    // to be one.
    var google_map = new GoogleMapView({
        el: $('#search_map'),
        results: this.results
    })


    $('#resourceView').hide()

    var ResourceView = Backbone.View.extend({

        el: $("#resourceView"),

        template: _.template($('#resource-template').html() || ""),
        emailTemplate: _.template($('#resource-email').html() || ""),

        events: {
            'click .back': 'hide',
            'click .email': 'email'
        },

        results: new ResourceCollection(),

        initialize: function(searchView){

            this.searchView = searchView
            this.map = google_map
        },

        showResource: function(resource){
            this.resource = resource
            var jsonResource = resource.toJSON()
            $('#resourceView').html(this.template(jsonResource))
            this.map.addResourceMarkers([jsonResource])
            this.map.setZoom(14);
            this.show()
            this.delegateEvents()
        },

        hide: function(){
            this.searchView.results.trigger("reset")
        },

        show: function(){
            $('#search_results').hide()
            $('#resourceView').show()
        },

        email: function(){
            var title = this.resource.get('title'),
                description = this.emailTemplate(this.resource.toJSON())
            description = description.replace(/\n/g, '%0D%0A')
            window.location = "mailto:?Subject=" + title + "&body=" + description
        }

    })

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
            'click .detail': 'showResource'
        },

        results: new ResourceCollection(),

        initialize: function(){


            var savedSearches = new SavedSearchCollection()

            var tmpl = this.templateSavedSearches
            savedSearches.on('reset', function(){
                $('#saved_searches').html(tmpl({
                    savedSearch: savedSearches.toJSON()
                }))
            })

            savedSearches.fetch()

            this.map = google_map
            this.map.results = this.results

            this.results.on('reset', this.map.render, this.map)
            this.results.on('reset', this.render, this)

            this.resourceView = new ResourceView(this)

            this.setupAutocomplete()
            this.search_timer = null

        },

        showLoading: function(){
            this.render(this.templateLoading)
        },

        search: function(){
            this.showLoading()
            this.results.fetch({data:$('#search_form').serializeHash()})
        },

        search_click: function(event){
            event.preventDefault()
            this.search()
            return false
        },

        search_auto: throttle(function(event){
            this.search()
            return true
        }, 500),

        saved_search: function (event) {
            event.preventDefault()
            var location = $(event.currentTarget).data('location')
            var query = $(event.currentTarget).data('query')

            $('#id_location').val(location)
            $('#id_query').val(query)
            this.search()
            return false
        },

        search_for: function(query, location){
            $('#id_location').val(location)
            $('#id_query').val(query)
            this.search()
            return false
        },

        nextPage: function(event){
            event.preventDefault()
            this.results.nextPage()
            return false
        },

        previousPage: function(event){
            event.preventDefault()
            this.results.previousPage()
            return false
        },

        firstPage: function(event){
            event.preventDefault()
            this.results.firstPage()
            return false
        },

        setupAutocomplete: function(){

            var qc = new QueryCollection();
            var that = this;

            $("#id_query").autocomplete({

                minLength: 2,

                source: function( request, response ) {

                    var term = request.term;

                    qc.on('reset', function(){
                        var titles = []
                        qc.each(function(r){
                            titles.push(r.get('title'))
                        })
                        response(titles)
                    })

                    qc.fetch({data:{
                        query: request.term,
                        location: $('#id_location').val()
                    }});

                }

            });

            $('#id_query').bind('autocompleteselect', function(event, ui){
                that.search_auto()
            })

        },

        showResource: function(event){
            event.preventDefault()
            var id = $(event.currentTarget).data('id')
            var resource = this.results.get(id)
            this.resourceView.showResource(resource)
            this.router.navigate("!/resource/" + resource.id)
            return false
        },

        render: function(template){

            $('#resourceView').hide()
            $('#search_results').show()
            if (!$.isFunction(template)){
                template = this.template
            }
            var context = _.clone(this.results.currentQueryData || {})
            context.resources =  this.results.toJSON()
            context.pageNumber = this.results.pageNumber + 1
            $('#search_results').html(template(context))

            $('span.truncate').expander({slicePoint: 200})

            this.delegateEvents()
            return this
        }

    })

    var app = new SearchView()

    var WorkspaceRouter = Backbone.Router.extend({

        routes: {
            "!/search/:query": 'search',
            "!/search/:query/:location": "search",
            "!/search/:query/:location/page/:page": "search",
            "!/resource/:id": "resource"
        },

        search: function(query, location, page) {
            if (!location){
                location = ''
            }
            app.search_for(decodeURIComponent(query), decodeURIComponent(location))
            page = parseInt(page, 10) - 1
            if(page){
                app.results.goToPage(page)
            }
        },

        resource: function(id){

            r = new Resource({"id": id});

            r.on("change", function(){

                app.resourceView.showResource(r)

            });

            r.fetch()

        }

    });

    app.router = new WorkspaceRouter()

    Backbone.history.start()

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
    }


})
