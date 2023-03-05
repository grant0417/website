import React from "react";

const Project = ({
  title,
  description,
  links,
  img,
  pills = [],
}: {
  title: string;
  description: string;
  links?: { text: string; url: string; icon: React.ReactNode }[];
  img?: React.ReactNode;
  pills?: React.ReactElement[];
}) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row flex-wrap gap-2 items-baseline">
        <h3 className="text-3xl text-white tracking-wider">{title}</h3>
        {pills.map((pill, i) => React.cloneElement(pill, { key: i }))}
      </div>
      {links && (
        <div className="flex flex-row flex-wrap gap-x-4 gap-y-2">
          {links.map((link, index) => (
            <a
              key={index}
              className="flex flex-row gap-1 items-center text-blue-300 hover:text-blue-200"
              href={link.url}
            >
              <span className="h-5 w-5 inline-block">{link.icon}</span>
              <span className="text-lg">{link.text}</span>
            </a>
          ))}
        </div>
      )}
      {img && img}

      <p className="text-white">{description}</p>
    </div>
  );
};

export default Project;
