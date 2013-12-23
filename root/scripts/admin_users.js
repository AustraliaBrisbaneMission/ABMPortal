function deleteUser(user) {
    if(confirm("Are you sure you want to delete user '" + user + "'?")) return true;
    return false;
}