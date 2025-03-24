import {Nunito} from "next/font/google";
import "./globals.css";
import Navbar from "./components/navbar/navbar";
import ClientOnly  from "./components/ClientOnly";
import ResgisterModal from "./components/Modals/RegisterModal";
import ToasterProvider from "./providers/ToasterProvider";
import LoginModal from "./components/Modals/LoginModal";
import getCurrentUser from "./actions/getCurrentUser";
import RentModal from "./components/Modals/RentModal";
import SearchModal from "./components/Modals/SearchModal";

export const metadata= {
  title: "Airbnb",
  description: "Airbnb-clone",
};
const font = Nunito({
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser =await getCurrentUser();

  return (
    <html lang="en">
      <body
        className={font.className}
      >
         {/* <Navbar /> */}
          <ClientOnly>
            <ToasterProvider/>
            <SearchModal/>
            <RentModal/>
            <LoginModal /> 
           <ResgisterModal /> 
          <Navbar currentUser ={currentUser}/>
        </ClientOnly> 
        <div className="pb-20 pt-28">
        {children}
        </div>
      </body>
    </html>
  );
}
