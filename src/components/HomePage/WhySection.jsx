const WhySection = () => {
  return (
    <section className="bg-[white] text-black py-20 text-center rounded-xl">
      <h2 className="text-4xl font-semibold mb-4">
        Simple & Powerful
      </h2>

      <p className="text-black-300 max-w-xl mx-auto mb-12">
        We craft top-quality products for peak performance.
      </p>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <div className="bg-gray-300 p-8 rounded-3xl">
          <h3 className="text-xl font-semibold mb-2">Continuous Innovation</h3>
          <p className="text-black-400">
            We continuously research and improve features.
          </p>
        </div>

        <div className="bg-gray-300 p-8 rounded-3xl">
          <h3 className="text-xl font-semibold mb-2">Simplicity</h3>
          <p className="text-black-400">
            User-centric design with creative interfaces.
          </p>
        </div>

        <div className="bg-gray-300 p-8 rounded-3xl">
          <h3 className="text-xl font-semibold mb-2">24x7 Support</h3>
          <p className="text-black-400">
            Dedicated support team ready anytime.
          </p>
        </div>
      </div>
    </section>
  );
};

export default WhySection;
