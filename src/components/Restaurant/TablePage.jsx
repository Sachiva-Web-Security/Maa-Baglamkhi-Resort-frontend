import React from "react";

const TablePage = () => {

  const tables = ["1","2","3","4","5","6"];

  return (
    <div>

      <h2 className="text-2xl font-bold mb-4">
        Tables
      </h2>

      <div className="grid grid-cols-4 gap-4">

        {tables.map(table => (

          <div
            key={table}
            className="p-6 bg-green-300 rounded text-center"
          >
            Table {table}
          </div>

        ))}

      </div>

    </div>
  );
};

export default TablePage;