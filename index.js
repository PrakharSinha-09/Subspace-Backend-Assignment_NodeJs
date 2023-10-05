const express = require('express');
const axios = require('axios');
const _ = require('lodash');

const app = express();
const port = 4000;

const memoize = require('lodash/memoize');

// Middleware to retrieve blog data
app.use('/api/blog-stats', async (req, res, next) => {
    console.log('Fetching middleware is running');
    try {
      const curlRequest = {
        method: 'GET',
        url: 'https://intent-kit-16.hasura.app/api/rest/blogs',
        headers: {
          'x-hasura-admin-secret': '32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6',
        },
      };
  
      const response = await axios(curlRequest);
      if (response.status === 200) {

        const blogData = response.data;  
        req.blogData = blogData;
  
        next();
      } 
      else {
        throw new Error('Failed to fetch blog data');
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Unable to fetch blog data' });
    }
});

// Define a function to perform analytics calculations
const calculateAnalytics = (blogData) => {
    const totalBlogs = blogData.blogs.length;
    
    // Finding the blog with the longest title
    const blogWithLongestTitle = _.maxBy(blogData.blogs, (blog) => blog.title.length);
    console.log(blogWithLongestTitle);

    // Determining the number of blogs with titles containing the word "privacy"
    const blogsWithPrivacyKeyword = _.filter(blogData.blogs, (blog) =>
      blog.title.toLowerCase().includes('privacy')
    );
    const numBlogsWithPrivacyKeyword = blogsWithPrivacyKeyword.length;

    // Create an array of unique blog titles (no duplicates)
    const uniqueBlogTitles = _.uniqBy(blogData.blogs, 'title');

    return {
        totalBlogs,
        blogWithLongestTitle,
        blogsWithPrivacyKeyword,
        numBlogsWithPrivacyKeyword,
        uniqueBlogTitles
    };
};

const memoizedCalculateAnalytics = memoize(calculateAnalytics, (blogData) => 'analytics', 300000);

//Analytics endpoint
app.get('/api/blog-stats/', (req, res) => {
    try {
        const blogData = req.blogData;
        // console.log(typeof blogData);
        const analyticsResults = memoizedCalculateAnalytics(blogData);
    
        res.json(analyticsResults);
        
    } catch (error) {
        res.status(500).json({ error: 'blog analytics failed!' });
    }

})


//here the search endpoint memoization function goes on!
const performSearch = (blogData, query) => {
    const searchResults = _.filter(blogData.blogs, (blog) =>
        blog.title.toLowerCase().includes(query.toLowerCase())
    );

    return searchResults;
};

const memoizedPerformSearch = memoize(performSearch, (blogData, query) => `search-${query}`, 300000);

// Search endpoint
app.get('/api/blog-stats/blog-search', (req, res) => {

    try {
        const { query } = req.query;
        const blogData = req.blogData;
        const searchResults = memoizedPerformSearch(blogData, query);
        res.json(searchResults);
        
    } catch (error) {
        console.log(error); 
        res.status(500).json({ error: 'Unable to search blogs' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})