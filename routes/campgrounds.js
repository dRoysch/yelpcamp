var express = require('express');
var router = express.Router({mergeParams: true});
var Campground = require('../models/campground');
var middleware = require('../middleware');
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'dwerxensf', 
  api_key: '771135114267714',//process.env.CLOUDINARY_API_KEY, //this are enviarament variables
  api_secret: 'lNvUqkpZAj80-MR7U7jLKamKIPs' //process.env.CLOUDINARY_API_SECRET
});
var Review = require("../models/review");


//INDEX - show all campgrounds
router.get("/", function(req, res){
   var perPage = 8;
   var pageQuery = parseInt(req.query.page);
   var pageNumber = pageQuery ? pageQuery : 1;
   var noMatch = null;
   if(req.query.search) {
       const regex = new RegExp(escapeRegex(req.query.search), 'gi');
       // Get all campgrounds from DB
       Campground.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
         Campground.count({name: regex}).exec(function (err, count) {
            if(err){
              console.log(err);
              res.redirect("back");
            } else {
               if(allCampgrounds.length < 1) {
                 noMatch = "No campgrounds match that query, please try again.";
               }
               res.render("./campgrounds/index",{
                  campgrounds: allCampgrounds,
                  current: pageNumber,
                  pages: Math.ceil(count / perPage), 
                  noMatch: noMatch,
                  search: req.query.search
               });
            }
         });
      });
      } else {
    // Get all campgrounds from DB
    Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
      Campground.count().exec(function (err, count) {
          if (err) {
              console.log(err);
          } else {
              res.render("campgrounds/index", {
                  campgrounds: allCampgrounds,
                  current: pageNumber,
                  pages: Math.ceil(count / perPage),
                  noMatch: noMatch,
                  search: false
              });
          }
      });
  });
}
});
   
 //CREATE - add new campground to DB
 router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
   cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
     if(err) {
       req.flash('error', err.message);
       return res.redirect('back');
     }
     // add cloudinary url for the image to the campground object under image property
     req.body.campground.image = result.secure_url;
     // add image's public_id to campground object
     req.body.campground.imageId = result.public_id;
     // add author to campground
     req.body.campground.author = {
       id: req.user._id,
       username: req.user.username
     }
     Campground.create(req.body.campground, function(err, campground) {
       if (err) {
         req.flash('error', err.message);
         return res.redirect('back');
       }
       res.redirect('/campgrounds/' + campground.id);
     });
   });


   //  var name = req.body.name;
   //  var price = req.body.price;
   //  var image = req.body.image;
   //  var desc = req.body.description;
   //  var author = {
   //     id: req.user._id,
   //     username: req.user.username
   //  } 
      
   //  var newCampground = {
   //          name: name, 
   //          price: price,
   //          image: image, 
   //          description: desc, 
   //          author: author
   //    };
   //  // Create a new campground and save to DB
   //  Campground.create(newCampground, function(err, newlyCreated){
   //     if(err){
   //       req.flash('error', 'Something went wrong');
   //     } else {
   //       req.flash('success', 'Campground successfully created');
   //          res.redirect('/campgrounds');
   //     }
   //  })
 });
 
 //NEW - show form to create new campground
router.get('/new', middleware.isLoggedIn, (req, res)=>{
    res.render('./campgrounds/new');
 });
 
 // SHOW - shows more info about one campground
 router.get("/:id", function (req, res) {
   //find the campground with provided ID
   Campground.findById(req.params.id).populate("comments").populate({
       path: "reviews",
       options: {sort: {createdAt: -1}}
   }).exec(function (err, foundCampground) {
         if(err || !foundCampground){
            req.flash('error', 'Campground not found');
            res.redirect('back');
       } else {
           //render show template with that campground
           res.render("campgrounds/show", {camps: foundCampground});
       }
   });
});
// router.get('/:id', (req, res)=>{
//     //find the campground with provided ID
//     Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
//        if(err || !foundCampground){
//           req.flash('error', 'Campground not found');
//           res.redirect('back');
//        } else {
//          //  console.log(foundCampground);
//           //render show template with that campground
//           res.render('./campgrounds/show', {camps: foundCampground});   
//        }
//     });
//  });

//  EDIT CAMPGROUND ROUTE
router.get('/:id/edit', middleware.checkCampgroundOwnership, function(req, res){
   Campground.findById(req.params.id, function (err, foundCampground){
      if(err){
         req.flash('error', 'Something went wrong');
      }
      res.render('campgrounds/edit', {campground: foundCampground});
   });
});

// UPDATE CAMPGROUND ROUTE
router.put('/:id', middleware.checkCampgroundOwnership, upload.single('image'), function(req, res){
   Campground.findById(req.params.id, async function(err, campground){
      if(err){
         req.flash('error', 'Something went wrong');
         res.redirect('/campgrounds');
      } else{
            if(req.file){
               try{
                  await cloudinary.v2.uploader.destroy(campground.imageId);
                  var result = await cloudinary.v2.uploader.upload(req.file.path);
                  campground.imageId = result.public_id;
                  campground.image = result.secure_url;
               } catch(err) {
                  req.flash('error', err.message);
                  res.redirect('/campgrounds');
               }
            }
            campground.name = req.body.campground.name;
            campground.description = req.body.campground.description;
            campground.price = req.body.campground.price;
            campground.save();
            req.flash('success', 'Campground successfully edited');
            res.redirect('/campgrounds/' + req.params.id);
      }
   });

   // // find and update the correct campground
   // Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground){
   //    if(err){
   //       req.flash('error', 'Something went wrong');
   //       res.redirect('/campgrounds');
   //    } else{
   //       req.flash('success', 'Campground successfully edited');
   //       res.redirect('/campgrounds/' + req.params.id);
   //    }
   // });
   // // redirect to show page
});

// DESTROY CAMPGROUND ROUTE
router.delete('/:id', middleware.checkCampgroundOwnership, function(req, res){
   Campground.findById(req.params.id, async function(err, campground){
      if(err){
         req.flash('err', err.message);
         return res.redirect('back');
      }
      try{
         await cloudinary.v2.uploader.destroy(campground.imageId);
         Comment.remove({"_id": {$in: campground.comments}});
         Review.remove({"_id": {$in: campground.reviews}});
         campground.remove();
         req.flash('success', 'Campground deleted successfully');
         res.redirect('/campgrounds');
      } catch(err) {
         if(err) {
            req.flash('err', err.message);
            return res.redirect('back');
         }   
      }
   })

   // Campground.findByIdAndRemove(req.params.id, function(err){
   //    if(err){
   //       req.flash('error', 'Something went wrong');
   //       res.redirect('/campgrounds');
   //    } else {
   //       req.flash('success', 'Campground successfully deleted');
   //       res.redirect('/campgrounds');
   //    }
   // });
});

function escapeRegex(text) {
   return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

 module.exports = router;