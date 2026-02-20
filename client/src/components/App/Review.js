import React, { useState } from 'react';
import ReviewTitle from './ReviewTitle';
import ReviewBody from './ReviewBody';
import ReviewRating from './ReviewRating';
import MovieSelection from './MovieSelection';
import LogInPage from './LogInPage';
import Registration from './Registration';
//import all necessary libraries here, e.g., Material-UI Typography, as follows
import Typography from '@mui/material/Typography';


const Review = () => {

  //states declarations
  //constants and functions declarations

  // isLogin starts as true.
  const [isLogin, setIsLogin] = useState(true);
  // This function flips the boolean (true -> false / false -> true)
  const handlePageSwitch = () => {
      setIsLogin(!isLogin); 
      console.log("Page flipped! isLogin is now:", !isLogin);
  };
  return (
    <>
      {isLogin ? (
        <LogInPage onSwitchPage={handlePageSwitch} />
      ) : (
        <Registration onSwitchPage={handlePageSwitch} />
      )}
    </>
  );
}

export default Review;
