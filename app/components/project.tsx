import React from "react";
import { IconType } from "react-icons";

const Project = ({
  title,
  description,
  links,
  img,
  pills = [],
}: {
  title: string;
  description: string;
  links?: { text: string; url: string; icon: React.ReactNode | IconType }[];
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
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              className="flex flex-row gap-1 items-center text-blue-300 hover:text-blue-200"
            >
              {typeof link.icon === "function" ? (
                <link.icon className="h-4 w-4 inline-block" />
              ) : (
                <span className="h-4 w-4 inline-block">{link.icon}</span>
              )}

              <span>{link.text}</span>
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
