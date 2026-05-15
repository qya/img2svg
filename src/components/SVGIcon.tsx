import React from 'react';

interface SVGIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const SVGIcon: React.FC<SVGIconProps> = ({ size, className, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 300 300"
      width={size || props.width}
      height={size || props.height}
      className={className}
      {...props}
    >
      <desc>
        Designed for the SVG Logo Contest in 2006 by Harvey Rayner, and adopted by W3C in 2009.
        It is available under the Creative Commons license for those who have an SVG product
        or who are using SVG on their site.
      </desc>
      <g stroke="#000" strokeWidth="38.009">
        <g id="b" transform="translate(150 150)">
          <path
            id="a"
            fill="#ffb13b"
            d="M-84.149-15.851a22.417 22.417 0 1 0 0 31.702H84.15a22.417 22.417 0 1 0 0-31.702Z"
          />
          <use xlinkHref="#a" transform="rotate(45)" />
          <use xlinkHref="#a" transform="rotate(90)" />
          <use xlinkHref="#a" transform="rotate(135)" />
        </g>
      </g>
      <use xlinkHref="#b" />
    </svg>
  );
};

export default SVGIcon;
