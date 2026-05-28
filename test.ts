const fetchImages = async () => {
    try {
        const res = await fetch('https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=5');
        const data = await res.json();
        console.log(data);
    } catch (e) {
        console.error(e);
    }
};
fetchImages();
