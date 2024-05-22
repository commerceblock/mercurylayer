# Use the official nginx image as the base
FROM nginx:latest

# Copy the contents of your local /explorer folder to the container's working directory
COPY ../explorer/index.html /usr/share/nginx/html
COPY ../explorer/main.js /usr/share/nginx/html
COPY ../explorer/nginx.conf /etc/nginx/nginx.conf

# Expose port 80 for web traffic
EXPOSE 80

# Use the default nginx configuration (serves content from the working directory)
CMD ["nginx", "-g", "daemon off;"]
