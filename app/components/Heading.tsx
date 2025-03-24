// 'use client';

// interface HeadingProps {
//   title: string;
//   subtitle: string;
//   center?: boolean;
// }

// const Heading: React.FC<HeadingProps> = ({ title, subtitle, center }) => {
//   return (
//     <div className={center ? 'text-center' : 'text-start'}>
//       <div className="text-2xl font-bold">{title}</div>
//       <div className="font-light text-neutral-500 mt-2">{subtitle}</div>
//     </div>
//   );
// };

// export default Heading;



'use client';

interface HeadingProps {
  title: string;
  subtitle: string;
  center?: boolean;
}

const Heading: React.FC<HeadingProps> = ({ title, subtitle, center }) => {
  return (
    <div className={`${center ? 'text-center' : 'text-start'} mb-6`}>
      <div className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-wide">
        {title}
      </div>
      <div className="font-medium text-gray-600 mt-2 text-lg md:text-xl">
        {subtitle}
      </div>
      <div className={`w-16 h-1 bg-blue-500 mx-auto mt-3 rounded-full ${center ? '' : 'ml-0'}`}></div>
    </div>
  );
};

export default Heading;