echo "Generate server keys"
cd server
openssl genrsa -out server-private-key.pem 4096
openssl req -new -key server-private-key.pem -out server-certificate-signing-request.pem
openssl x509 -req -in server-certificate-signing-request.pem -signkey server-private-key.pem -out server-certificate.pem
echo "Generate client keys"
cd ../client
openssl genrsa -out client-private-key.pem 4096
openssl req -new -key client-private-key.pem -out client-certificate-signing-request.pem
openssl x509 -req -in client-certificate-signing-request.pem -signkey client-private-key.pem -out client-certificate.pem