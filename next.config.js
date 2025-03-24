//browser band karna while running this file 

/**{import('next').NextConfig}*/

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

module.exports = nextConfig;

//check kar na video ma 2:42:30 sa check kar na 



// /** @type {import('next').NextConfig} */
// const nextConfig = {
//     images: {
//       domains: ["avatars.githubusercontent.com"],
//     },
//   };
  
//   module.exports = nextConfig;
  



// /** @type {import('next').NextConfig} */
// const nextConfig = {
//     images: {
//       remotePatterns: [
//         {
//           protocol: "http",
//           hostname: "avatars.githubusercontent.com",
//           hostname: "lh3.googleusercontent.com"
//         },
//       ],
//     },
//   };
  
//   module.exports = nextConfig;
  