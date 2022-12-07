import * as React from 'react';

export const Download = ({
    name,
    svg,
}: {
    name: string;
    svg: React.MutableRefObject<null | SVGSVGElement>;
}) => {
    const [url, setUrl] = React.useState(null as null | string);

    return url ? (
        <a
            href={url}
            download={name}
            onClick={() => {
                setTimeout(() => setUrl(null), 50);
            }}
        >
            Download {name}
        </a>
    ) : (
        <button
            onClick={() => {
                let contents =
                    svg.current!.outerHTML +
                    `<!-- STATE\n` +
                    JSON.stringify(localStorage) +
                    '\n-->';
                const blob = new Blob([contents], {
                    type: 'image/svg+xml',
                });
                setUrl(URL.createObjectURL(blob));
            }}
        >
            Download {name}
        </button>
    );
};
