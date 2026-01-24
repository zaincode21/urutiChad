import React from 'react';

const MaterialIcon = ({ name, className = "", style = {} }) => {
    return (
        <span
            className={`material-symbols-outlined ${className}`}
            style={style}
        >
            {name}
        </span>
    );
};

export default MaterialIcon;
