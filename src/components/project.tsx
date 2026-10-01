import { cloneElement } from "react";

const Project = ({
  title,
  date,
  description,
  links,
  img,
  pills = [],
}: {
  title: string;
  date?: string;
  description?: string;
  links?: { text: string; url: string; icon: React.ReactNode }[];
  img?: React.ReactNode;
  pills?: React.ReactElement[];
}) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row flex-wrap gap-2 items-baseline">
        <h3 className="text-3xl text-white tracking-wider">
          {title}
          {date && (
            <>
              {" "}
              <span className="text-lg tracking-normal">
                ({date}){/*  */}
              </span>
            </>
          )}
        </h3>
        {pills.map((pill, i) => cloneElement(pill, { key: i }))}
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
      {description && <p className="text-white">{description}</p>}
    </div>
  );
};

export default Project;
