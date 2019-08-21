var express = require('express');
var router = express.Router({mergeParams: true});
var Campground = require('../models/campground');
var Comment = require('../models/comment');
var middleware = require('../middleware');

// comments new
router.get('/new', middleware.isLoggedIn, (req, res)=>{
    Campground.findById(req.params.id, function(err, foundCampground){
       if(err){
         req.flash('error', 'Campground not found');
       } else {
          res.render('./comments/new', {campground: foundCampground});
       }
 });
 });
 
//  comments create
router.post('/', middleware.isLoggedIn, function(req, res){
    // lookup campground using ID
    Campground.findById(req.params.id, function(err, foundCampground){
       if(err){
         req.flash('error', 'Campground not found');
          res.redirect("/campgrounds")
       } else {
          Comment.create(req.body.comment, function(err, comment){
             if(err){
               req.flash('error', 'Something went wrong');
             } else {
                comment.author.id = req.user._id;
                comment.author.username = req.user.username;
                comment.save();
                foundCampground.comments.push(comment);
                foundCampground.save();
                req.flash('success', 'Comment successfully created');
                res.redirect('/campgrounds/' + foundCampground._id);
             }
          });
       }
    });
 });
 
//  COMMENT EDIT ROUTE
router.get('/:comment_id/edit', middleware.checkCommentOwnership, function(req, res){
   Campground.findById(req.params.id, function (err, foundCampground){
      if(err || !foundCampground){
         req.flash('error', 'Campground not found');
         return res.redirect('back');
      }
      Comment.findById(req.params.comment_id, function(err, foundComment){
         if(err){
            req.flash('error', 'ERROR');
            res.redirect('back');
         } else {
               res.render('comments/edit', {campground_id: req.params.id, comment: foundComment});
         }
      });
   });

});
//  COMMENT UPDATE
router.put('/:comment_id', middleware.checkCommentOwnership, function(req, res){
   Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
      if(err){
         req.flash('error', 'Comment not found');
         res.redirect('back');
      } else { 
            req.flash('success', 'Comment successfully edited');
            res.redirect('/campgrounds/' + req.params.id);
     }});
});

// COMMENT DESTROY ROUTE
router.delete('/:comment_id', middleware.checkCommentOwnership, function(req, res){
   Comment.findByIdAndRemove(req.params.comment_id, function(err){
   if(err){
      req.flash('error', 'Comment not found');
      res.redirect('back');
   } else {
      req.flash('success', 'Comment successfully deleted');
      res.redirect('/campgrounds/' + req.params.id);
   }
   });
 });


 module.exports = router;