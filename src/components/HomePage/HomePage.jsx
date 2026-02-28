import HeroSection from "./HeroSection";
import ProductTabs from "./ProductTabs";
import WhySection from "./WhySection";
import States from "./States";

const HomePage = () => {
  return (
    <div className="space-y-6">

      <div >
        <HeroSection />
      </div>

      <div >
        <ProductTabs />
      </div>

      <div >
        <WhySection />
      </div>

      <div >
        <States />
      </div>

    </div>
  );
};

export default HomePage;