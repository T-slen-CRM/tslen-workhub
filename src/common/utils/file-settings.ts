// Must match task-create-edit.component.ts's acceptedFileTypes - the file
// picker there advertises image/gif as accepted, but this list didn't
// include it, so a picked GIF passed the browser's file dialog and then
// failed backend validation with a confusing 500 (see the pipe below).
export const ALLOWED_FILE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif'];
